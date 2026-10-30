---
title: "DB の初期データなど Git 管理対象外のデータをバックアップする"
needs-user-action: true
milestone: "03 競技開始直後"
labels:
  - type:backup
  - type:task
depends_on:
  - prepare-local-access.md
---

# 必要な情報

必要な情報: 取得対象と除外、接続方法・権限、実行範囲・空き時間、サイズと影響、Release の公開範囲。既に提供・許可された内容は再質問しない。秘密情報の値は書かない。

# 目的

アプリケーションコードや設定ファイルは Git で管理するため、このタスクの対象にしない。
DB の初期データなど Git に入れないデータを、復旧と比較のために保存する。

# 前提条件

- データの取得対象・接続方法・許可が確認できている。Git 初期化完了は必須にしない。可能なら提供状態を変更する前に取得する。初回ベンチはこのタスクを待たず、取得時点とベンチ実行の前後関係を記録する。
- ベンチマーク実行中ではない空き時間に行う。
- アーカイブが大きい、または影響が不明なら、実行前にユーザーへ確認する。

# 対象サーバー

初期化前は isucon 接続から sudo で必要な読み取り権限を得る。バックアップのために root SSH や Git 初期化の完了を待たない。

Issue に記録した全競技サーバー。

# 作業

- バックアップ対象と除外対象を Issue に記録する。
- ベンチマークに影響しない空き時間にサーバーから取得する。
- 必要に応じて帯域と I/O を制限する。
- タイムスタンプ付きアーカイブを作成する。
- サイズが大きい、または影響が不明な場合は実行前にユーザーへ確認する。
- 取得直後は一時領域に保持し、初回ベンチの成功・失敗を問わず、その `bench-<id>` Release ができたらこのタスクで添付・照合する。
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
ssh s1 'sudo bash -s' <<'EOF'
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
ssh s1 'sudo bash -s' <<'EOF'
set -euo pipefail
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

## 4. 初回ベンチの Release へ引き継ぐ

アーカイブの正確なパス、サイズ、SHA-256、取得日時、対象と初回ベンチとの前後関係を Issue に記録して保持する。初回の成功・失敗を問わず、初回ベンチの `bench-<id>` Release にこのタスクで添付する。ベンチ後の取得は提供直後のデータと断定しない。別の初期バックアップ専用 Release を新規作成しない。

添付後はダウンロードした asset のサイズ・digest と照合する。再起動前に必要な一時ファイルをローカル等へ退避する。既存 Release や asset を上書きしない。

# 確認方法

```bash
ls -lh /tmp/isucon-work/backup
gzip -t /tmp/isucon-work/backup/s1-db-*.sql.gz
shasum -a 256 /tmp/isucon-work/backup/*.sql.gz
```

バックアップをリポジトリ外で保持し、Git の追跡対象に含まれていないことを確認する。

復旧は dump を流し込む。例: `zcat /tmp/isucon-work/backup/s1-db-*.sql.gz | mysql`。認証は実機の既存設定を使う。

# 失敗時の復旧

- ディスク不足: `/tmp` の途中ファイルを消し、対象を絞って再実行する。
- 取得がアプリに影響する: `ionice` / `rsync --bwlimit` を強めるか、中断して空き時間に再開する。
- 引き継ぎ・添付失敗: 一時領域の原本を保持し、初回ベンチ Issue に不足を記録する。

# 完了条件

- 取得日時、対象、サイズ、SHA-256、保存先、取得結果と復旧方法が Issue に記録され、初回ベンチ Issue へ引き継がれている。Release 添付とサイズ・digest の照合をこのタスクで完了する。
- バックアップが Git の履歴に追加されていない。
- アプリケーションコードや設定ファイルがバックアップ対象に含まれていない。
- 復旧方法を確認できる。

