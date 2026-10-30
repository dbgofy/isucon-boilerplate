---
title: "初期スキーマとインデックスを確認する"
milestone: "04 競技序盤"
labels:
  - type:database
  - type:documentation
depends_on:
  - initialize-servers.md
  - prepare-deploy.md
---

# 目的

初期状態のテーブル、インデックス、データ量を記録し、以後の DB 改善の前提にする。

# 前提条件

- このタスクではインデックス追加などの変更を行わない。
- 接続情報はサーバー上の既存設定を使う。推測でパスワードを書かない。

# 対象サーバー

DB が動いているサーバー。配置は既存設定や実機で確認する。

# 作業

- 初回ベンチ後の観測ならその時刻と commit を明記し、初期状態と断定しない。`information_schema.table_rows` は概算であり、正確な件数とは記録しない。詳細は `knowledges/` に保存し README からリンクする。

- スキーマ定義の場所を確認する。
- 既存インデックスと主キー、外部キーを一覧する。
- 主要テーブルのおおよその行数とサイズを記録する。
- 確認結果は事実として Issue に残し、改善案は仮説と分ける。
- インデックス追加などの変更はこのタスクでは行わない。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
mkdir -p /tmp/isucon-work/schema
DBHOST=s1
```

## 1. スキーマ定義ファイルの場所を確認する

```bash
ssh "$DBHOST" 'find /home/isucon /opt /etc -name "*.sql" 2>/dev/null | head -n 50
ls -la /home/isucon/webapp 2>/dev/null || true'
```

## 2. データベースとテーブルを一覧する

```bash
ssh "$DBHOST" 'mysql -e "SHOW DATABASES;"' | tee /tmp/isucon-work/schema/databases.txt
ssh "$DBHOST" 'bash -s' <<'EOF' | tee /tmp/isucon-work/schema/tables.txt
mysql -e "SELECT table_schema, table_name, engine, table_rows, data_length, index_length, (data_length+index_length) AS total
FROM information_schema.tables
WHERE table_schema NOT IN ('mysql','information_schema','performance_schema','sys')
ORDER BY table_schema, table_name;"
EOF
```

## 3. インデックスとキーを一覧する

```bash
ssh "$DBHOST" 'bash -s' <<'EOF' | tee /tmp/isucon-work/schema/indexes.txt
mysql -e "SELECT table_schema, table_name, index_name, non_unique, seq_in_index, column_name
FROM information_schema.statistics
WHERE table_schema NOT IN ('mysql','information_schema','performance_schema','sys')
ORDER BY table_schema, table_name, index_name, seq_in_index;"
EOF
```

CREATE TABLE が必要なら、確認した DB 名だけ dump する。

```bash
# DBNAME は SHOW DATABASES で確認した値
ssh "$DBHOST" 'mysqldump --no-data "$DBNAME"' > /tmp/isucon-work/schema/schema.sql
```

## 4. 事実と仮説を分けて Issue に書く

```bash
gh issue comment "$ISSUE" --body "$(cat <<'EOF'
## 事実

- スキーマファイルの場所:
- 主要テーブルの行数 / サイズ: `/tmp/isucon-work/schema/tables.txt`
- 既存インデックス: `/tmp/isucon-work/schema/indexes.txt`

## 仮説（このタスクでは変更しない）

- 
EOF
)"
```

# 確認方法

```bash
ls -l /tmp/isucon-work/schema
wc -l /tmp/isucon-work/schema/*.txt
```

# 失敗時の復旧

- `mysql` が認証失敗する: `/etc/mysql` と `~isucon` の既存設定を確認する。パスワードを Issue に書かない。
- 行数が概数: `information_schema.table_rows` は概算である旨を記録する。正確な件数が必要なら `COUNT(*)` は負荷を見てから行う。

# 完了条件

- 初期スキーマと既存インデックスの一覧がある。
- 推測で変更対象を決めていない。

