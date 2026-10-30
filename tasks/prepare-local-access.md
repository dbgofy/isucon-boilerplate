---
title: "ローカルの接続設定を用意する"
needs-user-action: true
labels:
  - phase:start
  - type:infrastructure
  - type:task
depends_on:
  - prepare-repo.md
  - apply-provided-infra.md
---

# 目的

競技サーバーとアプリケーションへ、手元の環境から再現可能な方法で接続できるようにする。

# 前提条件

- 接続先、IP、鍵の場所はユーザー提供情報、または `apply-provided-infra.md` の適用結果を正とする。
- 秘密鍵はリポジトリに保存しない。

# 対象サーバー

ユーザーから受け取った全競技サーバー。

# 作業

- ユーザーから受け取った接続先、または運営手順の適用結果を正として、SSH の接続設定を用意する。
- 必要な名前解決をローカルに用意する。
- 接続ユーザーは、初回セットアップ時のみ `isucon`、完了後は `root` とする。
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
- IdentityFile のパス（リポジトリ外）:
- 名前解決が必要か:
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

追記例。ファイル全体を書き直さない。`HostName` と `IdentityFile` は Issue の値で置き換える。

```sshconfig
Host s1
  HostName REPLACE_WITH_USER_PROVIDED_IP
  User isucon
  IdentityFile ~/.ssh/REPLACE_WITH_USER_PROVIDED_KEY
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new

Host s2
  HostName REPLACE_WITH_USER_PROVIDED_IP
  User isucon
  IdentityFile ~/.ssh/REPLACE_WITH_USER_PROVIDED_KEY
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new

Host s3
  HostName REPLACE_WITH_USER_PROVIDED_IP
  User isucon
  IdentityFile ~/.ssh/REPLACE_WITH_USER_PROVIDED_KEY
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
```

初期化完了後は各 `User` を `root` に変更する。

## 3. 必要な名前解決をローカルに用意する

運営またはユーザーがホスト名を指定している場合のみ。`/etc/hosts` を推測で書き換えない。
編集する場合はバックアップを取り、既存の空行やコメントを残したまま末尾へ追記する。
`getent hosts` は名前解決の確認にだけ使う。出力にはコメントも空行も出ないので、ファイルの確認や書き戻しには使わない。

```bash
# 指定がある場合の例。値は Issue に記録したものを使う。
# STAMP=$(date +%Y%m%d%H%M%S)
# sudo cp -a /etc/hosts /etc/hosts.bak.${STAMP}
# sudo tee -a /etc/hosts <<'EOF'
# 192.0.2.10 isucondition-1
# EOF
# diff -u /etc/hosts.bak.${STAMP} /etc/hosts
# getent hosts isucondition-1
```

## 4. 接続を確認する

```bash
SERVERS=(s1 s2 s3)
for s in "${SERVERS[@]}"; do
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$s" 'whoami; hostname; hostname -I'
done
```

# 確認方法

```bash
ssh -G s1 | egrep '^(host|hostname|user|identityfile) '
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

- チームメンバーが同じ接続方法で各サーバーへ入れる。
- 接続先、ユーザー、名前解決の根拠を Issue に記録している。

