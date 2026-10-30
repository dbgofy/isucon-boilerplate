---
title: "計測とモニタリングを準備する"
labels:
  - phase:early-competition
  - type:observability
  - type:task
depends_on:
  - check-environment.md
---

# 目的

改善判断に必要なログ、プロファイル、メトリクスを取得できるようにする。

# 前提条件

- 監視は各サーバーで手動起動し、再起動後に自動起動させない。
- 提出用計測で無効化できること。手順は `disable-instrumentation.md` へつながる。

# 対象サーバー

Issue に記録した全競技サーバー。

# 作業

- アクセスログ、エラーログ、DB slow query log の取得方法を確認する。
- pprof などの計装を必要最小限で導入する。
- サーバー監視は各サーバーで `make monitoring` を実行して起動する。
- 監視サービスが再起動後に自動起動しないことを確認する。
- 収集データの保存先、保持期間、停止方法を確認する。
- 提出用スコア計測前に簡単に無効化できる構成にする。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
```

## 1. 既存ログの場所を確認する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'bash -s' <<'EOF'
hostname
ls -l /var/log/nginx /var/log/mysql /var/log/syslog 2>/dev/null || true
grep -RInE 'access_log|error_log|slow_query|long_query_time' /etc/nginx /etc/mysql 2>/dev/null | head
journalctl -u nginx -n 5 --no-pager 2>/dev/null || true
EOF
done
```

## 2. slow query log の状態を確認する

有効化が必要なら、原本を Git に入れてからローカルで変更し `git pull` する。このタスクで未確認のまま設定を書き換えない。

```bash
ssh s1 'mysql -e "SHOW VARIABLES LIKE '\''slow_query_log%'\''; SHOW VARIABLES LIKE '\''long_query_time'\''; SHOW VARIABLES LIKE '\''slow_query_log_file'\'';" 2>/dev/null || true'
```

## 3. サーバー監視を手動起動する

systemd で enable しない。`make monitoring` は nohup で起動する。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'cd / && make monitoring'
done
```

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'ss -lntp | grep -E ":3999|:9090|:9100|:9256" || true
    systemctl is-enabled prometheus 2>/dev/null || echo "prometheus not a systemd unit"
    pgrep -a prometheus || true'
done
```

ブラウザで各サーバーの `http://<接続先>:3999/` を開く。接続先は Issue の値を使う。

## 4. 再起動後に自動起動しないことを確認する

```bash
ssh s1 'systemctl list-unit-files | grep -iE "prometheus|node_exporter|grafana|process-exporter" || true
ls /etc/systemd/system | grep -iE "prometheus|grafana|exporter" || true'
```

unit が作られていたら disable し、起動方法は `make monitoring` に戻す。

## 5. アプリ計装は必要最小限にする

pprof 等を入れる場合はローカルで変更し、無効化手順を Issue に書く。問題固有のエンドポイント名は、実機とマニュアルで確認してから記録する。

```text
- 有効化した計装:
- 停止方法:
- 提出前に無効化するか:
```

# 確認方法

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3999/ || echo grafana_ng
    curl -fsS http://127.0.0.1:9100/metrics | head >/dev/null && echo node_exporter_ok'
done
```

# 失敗時の復旧

- 監視が負荷になる: サーバーを再起動して監視プロセスを落とす。
- `make monitoring` が落ちる: `ps aux | grep -E 'prometheus|grafana|exporter'` と `/tmp` の nohup 出力を確認する。

```bash
ssh s1 'pkill prometheus; pkill node_exporter; pkill process-exporter; pkill grafana-server; true'
```

# 完了条件

- 必要な観測データを取得できる。
- 監視停止はサーバー再起動で行える。
- 計測機能を提出前に無効化する手順がある。

