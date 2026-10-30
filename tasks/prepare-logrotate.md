---
title: "ログローテーションを用意する"
labels:
  - phase:early-competition
  - type:observability
  - type:task
depends_on:
  - prepare-observability.md
---

# 目的

計測のたびにログを切り出し、前回結果と混ざらないようにする。

# 前提条件

- ログパスは `prepare-observability.md` で確認した値を使う。
- 手順は Makefile などリポジトリ上のコマンドにまとめる。

# 対象サーバー

アクセスログ、スロークエリ、アプリログがあるサーバー。ログパスは実機確認後に
`LOG_FILES` へ明示して渡す。未確認のサーバー固有パスは既定値に追加しない。

# 作業

- アクセスログ、スロークエリログ、アプリケーションログのパスを確認する。
- ベンチマーク前後で切る対象と、退避先を決める。
- Makefile など、毎回同じコマンドで実行できる手順にする。
- 切り出したログを集計や保存に渡せることを確認する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
```

## 1. 切る対象を確定する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'hostname
    ls -l /var/log/nginx/access.log /var/log/nginx/error.log /var/log/mysql/mysql-slow.log /var/log/mysql/slow.log 2>/dev/null || true'
done
```

## 2. ローカルに毎回同じコマンドを書く

退避先は `/var/log/archive/` など、Git 管理外にする。事前に `mkdir -p /var/log/archive` で作成する。`make rotate-logs` は既定で
Issue に確認済みの nginx access/error log を対象にし、存在しないファイルは無視する。
追加のログは、実機で確認した後に `LOG_FILES` で明示する。

```makefile
LOG_ARCHIVE_ROOT ?= /var/log/archive
LOG_FILES ?= /var/log/nginx/access.log /var/log/nginx/error.log

.PHONY: rotate-logs
rotate-logs:
	@set -eu; dest=$$(mktemp -d "$(LOG_ARCHIVE_ROOT)/$$(date +%Y%m%d-%H%M%S)-XXXXXX"); \
	for file in $(LOG_FILES); do \
	  if [ -f "$$file" ]; then mkdir -p "$$dest$$(dirname "$$file")"; mv -- "$$file" "$$dest$$file"; fi; \
	done; \
	nginx -s reopen
```

実機で確認済みの追加ログを切り出す場合:

```bash
make rotate-logs LOG_FILES='/var/log/nginx/access.log /var/log/nginx/error.log /confirmed/path.log'
```

この処理は対象ファイルをタイムスタンプ付きディレクトリへ移し、`nginx -s reopen`
が利用可能な場合に nginx のファイルディスクリプタを再オープンする。MySQL slow log
やアプリログは、実機でパスと再オープン方法を確認するまで対象に追加しない。

## 3. 一度実行して切り出せることを確認する

```bash
# ローカルで commit したあと
for s in "${SERVERS[@]}"; do
  ssh "$s" 'cd / && git pull origin master && make rotate-logs'
done
```

Makefile 反映前の手動確認。

```bash
ssh s1 'bash -s' <<'EOF'
set -eu
STAMP=$(date +%Y%m%d-%H%M%S)
DEST=/var/log/archive/$STAMP
mkdir -p "$DEST"
test -f /var/log/nginx/access.log && mv /var/log/nginx/access.log "$DEST/"
nginx -s reopen
ls -l "$DEST" /var/log/nginx/access.log
EOF
```

# 確認方法

```bash
ssh s1 'ls -lt /var/log/archive | head; sudo tail -n 1 /var/log/nginx/access.log || true'
```

新しいログファイルが空から書き始まること。

# 失敗時の復旧

- nginx がログを開けない: `nginx -s reopen` とディレクトリ権限を確認する。`/var/log/nginx` の所有者を変えてしまったら戻す。
- slow log が切られない: `slow_query_log_file` の実パスを `SHOW VARIABLES` で確認する。

# 完了条件

- 計測ごとにログを分けて保存できる。
- 手順がリポジトリまたは Issue に残っている。
