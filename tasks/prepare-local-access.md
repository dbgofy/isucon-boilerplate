---
title: "ローカルの接続設定を用意する"
needs-user-action: true
milestone: "03 競技開始直後"
labels:
  - type:infrastructure
  - type:task
depends_on:
  - prepare-repo.md
  - apply-provided-infra.md
---

# 目的

競技サーバーとアプリケーションへ、手元の環境から再現可能な方法で接続できるようにする。

# 前提条件

- 接続先、IP はユーザー提供情報、または `apply-provided-infra.md` の適用結果を正とする。
- 秘密鍵はリポジトリに保存しない。

# 対象サーバー

ユーザーから受け取った全競技サーバー。

# 作業

- ユーザーから受け取った接続先、または運営手順の適用結果を正として、SSH の接続設定を用意する。
- 必要な名前解決をローカルに用意する。
- 競技サーバーの接続ユーザーは、初回セットアップ時のみ `isucon`、完了後は `root` とする。
- 練習環境でベンチサーバーやポータルが提供された場合は、それぞれ指定されたユーザーと名前解決を設定する。
- 秘密鍵はリポジトリに保存しない。
- リポジトリ外のローカルファイルを編集する前に、タイムスタンプ付きのバックアップを取る。
- 既存の空行、コメント、Include などは削除・整形せず、必要な行だけ追記する。
- 接続できない場合は推測で接続先を変えず、ユーザーへ確認する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

## 1. 接続情報を Issue に転記する

推測で埋めない。不足があればユーザーへ確認する。

```text
- サーバー名 / 役割:
- 接続先 (IP または DNS):
- 初回 SSH ユーザー: isucon
- 初期化後 SSH ユーザー: root
- 認証方法: 既存 OpenSSH 設定・SSH agent・デフォルト鍵を使用。失敗時のみ追加確認:
- 名前解決に使うホスト名と IP（アプリケーションのドメインを含む）:
- 必要なローカルポート転送（接続先ホスト、ローカル側・リモート側のアドレスとポート）:
- 練習環境のみ: ベンチサーバー・ポータルの接続情報と SSH ユーザー（提供された場合）:
```

## 2. SSH 設定をローカルに書く

`~/.ssh/config` はリポジトリ外。Host 名はチームで揃える。
編集前にバックアップを取り、既存内容を上書きしない。空行やコメントを消さない。末尾に追記する。

```bash
install -d -m 700 ~/.ssh
STAMP=$(date +%Y%m%d%H%M%S)
test -f ~/.ssh/config && cp -a ~/.ssh/config ~/.ssh/config.bak.${STAMP}
touch ~/.ssh/config
chmod 600 ~/.ssh/config
```

追記例。ファイル全体を書き直さない。ホスト名はユーザーから受け取った名前に置き換え、次節の hosts と一致させる。転送設定は指定された場合だけ追加する。既存 OpenSSH 設定・SSH agent・デフォルト鍵を先に試し、必要な場合だけ認証方法を確認する。秘密鍵の内容は読まない。

```sshconfig
Host contest-1
  User isucon
  StrictHostKeyChecking accept-new
  LocalForward 127.0.0.1:3999 127.0.0.1:3999

Host contest-2
  User isucon
  StrictHostKeyChecking accept-new

Host contest-3
  User isucon
  StrictHostKeyChecking accept-new

# 練習環境でベンチサーバーが提供された場合のみ
Host bench
  User isucon
  StrictHostKeyChecking accept-new
```

競技サーバーは各サーバーの初期化完了後にその `User` を `root` に変更する。ベンチサーバーは指定されたユーザーのままとする。

## 3. 必要な名前解決をローカルに用意する

運営またはユーザーがホスト名を指定している場合のみ。`/etc/hosts` を推測で書き換えない。
編集する場合はバックアップを取り、既存の空行やコメントを残したまま末尾へ追記する。
`getent hosts` は名前解決の確認にだけ使う。出力にはコメントも空行も出ないので、ファイルの確認や書き戻しには使わない。

指定された名前とアドレスを以下の形式で追記する。アプリケーションやポータルのドメインは、提供された場合に対応する IP の行に併記する。ベンチサーバーとポータルは練習環境で提供された場合のみ追加する。

```text
192.0.2.10 contest-1 app.example.test
192.0.2.11 contest-2
192.0.2.12 contest-3
192.0.2.13 bench portal.example.test
```

```bash
# 編集前にバックアップを取り、指定された行だけ追記する。
STAMP=$(date +%Y%m%d%H%M%S)
sudo cp -a /etc/hosts /etc/hosts.bak.${STAMP}
# 編集後に差分と名前解決を確認する。
diff -u /etc/hosts.bak.${STAMP} /etc/hosts
# macOS: dscacheutil -q host -a name contest-1
# Linux: getent hosts contest-1
```

## 4. 接続を確認する

```bash
SERVERS=(contest-1 contest-2 contest-3) # 練習時は必要に応じ bench を追加
for s in "${SERVERS[@]}"; do
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$s" 'whoami; hostname; hostname -I'
done
```

# 確認方法

```bash
ssh -G contest-1 | egrep '^(host|hostname|user|identityfile|localforward) '
for s in "${SERVERS[@]}"; do
  ssh -o BatchMode=yes "$s" 'echo ok'
done
```

# 失敗時の復旧

- 接続できない: 接続先を推測で変えない。鍵パス、ユーザー、セキュリティグループ、ポータルの案内をユーザーへ確認する。
- `Permission denied`: `IdentityFile` と `IdentitiesOnly yes`、鍵のパーミッション (`chmod 600`) を確認する。
- ホスト名が解決できない: 指定された `/etc/hosts` または DNS だけを使う。
- 既存の SSH 設定や hosts を壊した: 編集前のバックアップから戻す。空行やコメントが消えていたら、整形せずバックアップを優先する。

# 完了条件

- チームメンバーが同じ接続方法で各サーバーへ入れる。指定されたポート転送を確認している。
- 接続先、ユーザー、名前解決の根拠を Issue に記録している。

