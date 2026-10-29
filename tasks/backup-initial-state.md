---
title: "DB の初期データなど Git 管理対象外のデータをバックアップする"
labels:
  - phase:start
  - type:backup
  - type:task
depends_on:
  - initialize-servers.md
---

# 目的

アプリケーションコードや設定ファイルは Git で管理するため、このタスクの対象にしない。
DB の初期データなど Git に入れないデータを、復旧と比較のために保存する。

# 前提条件

- `initialize-servers.md` が完了している。
- ベンチマーク実行中ではない空き時間に行う。
- アーカイブが大きい、または影響が不明なら、実行前にユーザーへ確認する。

# 対象サーバー

Issue に記録した全競技サーバー。

# 作業

- バックアップ対象と除外対象を Issue に記録する。
- ベンチマークに影響しない空き時間にサーバーから取得する。
- 必要に応じて帯域と I/O を制限する。
- タイムスタンプ付きアーカイブを作成する。
- サイズが大きい、または影響が不明な場合は実行前にユーザーへ確認する。
- 初期状態用の GitHub Release を作成し、asset を登録する。
- Release asset に秘密情報が含まれる場合は、公開範囲とアクセス権を確認する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p /tmp/isucon-work/backup
```

## 1. 対象と除外を記録する

Git に入れないが復旧に必要なデータだけを対象にする。アプリケーションコード、設定ファイル、秘密鍵は含めない。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'hostname; df -h; du -sh /var/lib/mysql /home/isucon/*.sql /home/isucon/**/*.sql 2>/dev/null'
done
```

Issue に次を書く。

- 取得対象（例: DB の初期ダンプ、シードデータ、Git 管理していない初期データファイル）
- 除外（アプリケーションコード、設定ファイル、秘密鍵、ログ、キャッシュ、バイナリ）
- 概算サイズ

サイズが大きい場合は、ここで停止してユーザー確認する。

## 2. サーバー上でアーカイブを作る

I/O を抑える。アプリケーションコードと設定ファイルは含めない。

MySQL が動いている場合はデータ込みで dump する。接続情報はサーバー上の既存設定を使う。

```bash
ssh s1 'bash -s' <<'EOF'
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
HOST=$(hostname -s)
OUT="/tmp/${HOST}-db-${STAMP}.sql.gz"
# 認証方法は実機の my.cnf / debian.cnf を確認してから使う
nice -n 19 ionice -c 3 mysqldump --single-transaction --all-databases | gzip -c > "$OUT"
ls -lh "$OUT"
echo "OUT=$OUT"
EOF
```

提供済みの初期 SQL やシードファイルが Git 管理対象外なら、確認したパスだけ別に取得する。

```bash
ssh s1 'bash -s' <<'EOF'
set -eu
# 実機で確認したパスだけ。例:
# ls -lh /home/isucon/webapp/sql/*.sql
true
EOF
```

他サーバーでも同じコマンドを繰り返す。

## 3. 手元へ取得し、Git には入れない

```bash
# サーバー上で表示された OUT パスを使う
rsync -avP --bwlimit=10000 s1:/tmp/s1-db-*.sql.gz /tmp/isucon-work/backup/
ls -lh /tmp/isucon-work/backup
# /tmp/isucon-work/backup は Git 管理しない
grep -n '' .gitignore || true
```

## 4. GitHub Release に asset として載せる

Release asset は暗号化保管ではない。秘密情報を含む場合は公開範囲を確認する。

```bash
TAG="db-initial-${STAMP}"
gh release create "$TAG" /tmp/isucon-work/backup/* \
  --repo OWNER/REPOSITORY \
  --title "DB初期データバックアップ ${STAMP}" \
  --notes "$(cat <<EOF
DB の初期データなど Git 管理対象外データのバックアップ。Git 履歴には含めていない。

- 取得日時: ${STAMP}
- 対象サーバー: Issue に記録したサーバー
- 除外: アプリケーションコード、設定ファイル、秘密鍵、ログ、キャッシュ
EOF
)"
```

# 確認方法

```bash
ls -lh /tmp/isucon-work/backup
gzip -t /tmp/isucon-work/backup/s1-db-*.sql.gz
zcat /tmp/isucon-work/backup/s1-db-*.sql.gz | head
gh release view "$TAG" --repo OWNER/REPOSITORY
git status --short /tmp/isucon-work/backup
```

`git status` でバックアップが staged / tracked になっていないこと。

復旧は dump を流し込む。例: `zcat /tmp/isucon-work/backup/s1-db-*.sql.gz | mysql`。認証は実機の既存設定を使う。

# 失敗時の復旧

- ディスク不足: `/tmp` の途中ファイルを消し、対象を絞って再実行する。
- 取得がアプリに影響する: `ionice` / `rsync --bwlimit` を強めるか、中断して空き時間に再開する。
- Release 作成失敗: 手元の `/tmp/isucon-work/backup` は残す。公開範囲を確認してから再作成する。

# 完了条件

- 取得日時、対象、サイズ、保存先、取得結果が Issue・PR・Release に記録されている。
- バックアップが Git の履歴に追加されていない。
- アプリケーションコードや設定ファイルがバックアップ対象に含まれていない。
- 復旧方法を確認できる。
