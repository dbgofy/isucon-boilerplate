---
title: "提出用ベンチマーク前に計測機能を無効化する"
labels:
  - phase:final-check
  - type:observability
  - type:deployment
depends_on:
  - reboot-3.md
---

# 目的

提出用スコアに不要なログ、プロファイラ、監視の影響を残さない。

# 前提条件

- 変更はローカルで行い、`git pull` で同期する。
- 監視プロセスは再起動で落ちる想定。自動起動していないことを先に確認する。

# 対象サーバー

Issue に記録した全競技サーバー。

# 作業

- デバッグログ、詳細ログ、pprof、slow query log などの計測機能を確認する。
- 各機能を無効化する変更をローカルで作成する。
- `git pull` で競技サーバーへ同期する。
- 無効化後のサービス状態を確認する。
- 無効化前後の差分と、無効化した機能を記録する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
BRANCH=master
```

## 1. 有効な計測機能を洗い出す

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'bash -s' <<'EOF'
hostname
pgrep -a prometheus || true
pgrep -a grafana || true
pgrep -a node_exporter || true
mysql -e "SHOW VARIABLES LIKE '\''slow_query_log'\''; SHOW VARIABLES LIKE '\''long_query_time'\'';" 2>/dev/null || true
grep -RInE 'pprof|debug|access_log|slow_query' /etc/nginx /etc/mysql /home/isucon 2>/dev/null | head
EOF
done
```

## 2. 無効化をローカルで入れる

対象は洗い出した機能だけ。例:

- slow query log をオフ
- 詳細アクセスログを通常形式へ戻す、または切る
- アプリの debug / pprof をビルドタグや設定で切る

変更後に pull して再起動する。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" "cd / && git pull origin ${BRANCH} && make deploy"
done
```

## 3. 監視プロセスを止める

`make monitoring` で起動したものは、提出用計測前に落とす。止め方はサーバー再起動、またはプロセス終了。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'pkill prometheus; pkill node_exporter; pkill process-exporter; pkill grafana-server; true'
done
```

再起動で止める場合。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'reboot'
done
```

## 4. 無効化後の状態を確認する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'pgrep -a prometheus || echo "no prometheus"
    pgrep -a grafana || echo "no grafana"
    systemctl is-active nginx
    ss -lntp'
done
```

# 確認方法

```bash
git log -1 --oneline
git diff HEAD~1 --stat
```

無効化した機能の一覧が Issue にあること。

# 失敗時の復旧

- アプリが落ちる: 無効化 commit を戻し、`make deploy` する。
- 監視が残る: `ps aux | grep -E 'prometheus|grafana|exporter'` で確認し、再起動する。

再有効化は `make monitoring` と、無効化前の設定へ revert。

```bash
git revert HEAD
# 各サーバーで git pull && make deploy
```

# 完了条件

- 提出用ベンチマークで不要な計測処理が動作していない。
- 必要なら再有効化できる。

