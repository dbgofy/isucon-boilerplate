---
title: "再起動試験（1回目）"
labels:
  - phase:mid-competition
  - type:validation
  - type:deployment
depends_on:
  - run-baseline-benchmark.md
---

# 目的

再起動後もサービスが正しく起動し、再起動直前のデータが欠損していないことを確認する。

この時点では変更を凍結しない。凍結後の最終再起動試験は `reboot-final.md` で行う。

# 前提条件

- この時点では変更を凍結しない。問題があれば Issue / PR で修正する。
- モニタリングは再起動後に自動起動しない。

# 対象サーバー

Issue に記録した全競技サーバー。

# 作業

- 現在の commit、設定、起動順序、再起動直前の Web ページを記録する。
- 各サーバーを再起動し、サービス状態と接続を確認する。
- 再起動後に、再起動直前の Web ページの内容が残っていることを確認する。
- 再起動後にモニタリングが自動起動していないことを確認する。
- 問題があれば Issue と PR に記録して修正する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "/tmp/isucon-work/${STAMP}-reboot-1"
```

## 1. 起動状態と Web ページを記録する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'bash -s' <<'EOF' | tee "/tmp/isucon-work/${STAMP}-reboot-1/${s}-before.txt"
hostname
git -C / rev-parse HEAD
git -C / status -sb
systemctl list-units --type=service --state=running --no-pager
ss -lntp
pgrep -a prometheus || echo 'no prometheus'
EOF
done
```

再起動直前に、データが見える Web ページを保存する。保存先が MySQL であるとは限らない。静的ページやヘルスチェックだけでは不足。URL はマニュアルと実機で確認した値を使う。

```bash
# HTTP の接続先とパスは Issue とマニュアルの値。推測で埋めない。
APP_URL=http://s1
PAGES=(
  /
  # データが見えるページを追加する
)
mkdir -p "/tmp/isucon-work/${STAMP}-reboot-1/pages-before"
: > "/tmp/isucon-work/${STAMP}-reboot-1/pages-before.txt"
for p in "${PAGES[@]}"; do
  name=$(printf '%s' "$p" | tr '/?' '__')
  http_code=$(curl -sS -D "/tmp/isucon-work/${STAMP}-reboot-1/pages-before/${name}.headers" \
    -o "/tmp/isucon-work/${STAMP}-reboot-1/pages-before/${name}.body" \
    -w '%{http_code}' "${APP_URL}${p}")
  echo "$p ${http_code} $(wc -c < "/tmp/isucon-work/${STAMP}-reboot-1/pages-before/${name}.body")" \
    | tee -a "/tmp/isucon-work/${STAMP}-reboot-1/pages-before.txt"
done
```

ブラウザでも同じページを開き、再起動直前に見えている内容を Issue に残す。

## 2. 再起動する

到達不能時間がある。コンソール手段があることを確認してから実行する。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'reboot' || true
done
```

## 3. 起動後にサービスと SSH を確認する

```bash
for s in "${SERVERS[@]}"; do
  until ssh -o ConnectTimeout=5 "$s" 'true'; do sleep 5; done
  ssh "$s" 'bash -s' <<'EOF' | tee "/tmp/isucon-work/${STAMP}-reboot-1/${s}-after.txt"
hostname
whoami
git -C / rev-parse HEAD
systemctl is-active nginx || true
ss -lntp
pgrep -a prometheus || echo 'no prometheus (expected)'
pgrep -a grafana || echo 'no grafana (expected)'
EOF
done
```

アプリ unit 名は `check-environment.md` の記録を使う。

```bash
# ssh s1 'systemctl is-active APP_UNIT'
```

## 4. 再起動直前の Web ページが残っていることを確認する

同じ URL を取得し、再起動直前と比較する。サービスが起動していても、ページが空、初期化直後、404 なら失敗とする。

```bash
# pages-before と同じ APP_URL と PAGES
mkdir -p "/tmp/isucon-work/${STAMP}-reboot-1/pages-after"
: > "/tmp/isucon-work/${STAMP}-reboot-1/pages-after.txt"
for p in "${PAGES[@]}"; do
  name=$(printf '%s' "$p" | tr '/?' '__')
  http_code=$(curl -sS -D "/tmp/isucon-work/${STAMP}-reboot-1/pages-after/${name}.headers" \
    -o "/tmp/isucon-work/${STAMP}-reboot-1/pages-after/${name}.body" \
    -w '%{http_code}' "${APP_URL}${p}")
  echo "$p ${http_code} $(wc -c < "/tmp/isucon-work/${STAMP}-reboot-1/pages-after/${name}.body")" \
    | tee -a "/tmp/isucon-work/${STAMP}-reboot-1/pages-after.txt"
done
diff -u "/tmp/isucon-work/${STAMP}-reboot-1/pages-before.txt" "/tmp/isucon-work/${STAMP}-reboot-1/pages-after.txt" || true
diff -ru "/tmp/isucon-work/${STAMP}-reboot-1/pages-before" "/tmp/isucon-work/${STAMP}-reboot-1/pages-after" || true
```

ブラウザで同じページを開き、再起動直前に見えていた内容が残っていることを確認する。

## 5. 結果を記録する

```text
- 結果: 成功 / 失敗
- データ欠損: なし / あり
- モニタリング自動起動: なし / あり
```

# 確認方法

```bash
diff -u /tmp/isucon-work/${STAMP}-reboot-1/s1-before.txt /tmp/isucon-work/${STAMP}-reboot-1/s1-after.txt || true
diff -u /tmp/isucon-work/${STAMP}-reboot-1/pages-before.txt /tmp/isucon-work/${STAMP}-reboot-1/pages-after.txt || true
diff -ru /tmp/isucon-work/${STAMP}-reboot-1/pages-before /tmp/isucon-work/${STAMP}-reboot-1/pages-after || true
```

再起動後も必要な listen があり、prometheus / grafana が居ないこと。
再起動直前に見えていた Web ページの内容が残っていること。CSRF や時刻など毎回変わる値の差は欠損ではない。一覧が空、件数が減る、詳細が 404、初期状態に戻るを欠損とする。

# 失敗時の復旧

- 起動しない: ポータルコンソールでログインし、`journalctl -xe` と `systemctl --failed` を保存する。
- データ欠損: ページ内容が消えた原因として、保存先の mount、起動時の初期化、メモリ上だけの保存を確認し、永続化してから再試験する。原因を Issue に書く。
- 手動作業が必要だった: その手順を Git / systemd に入れてから再試験する。
- モニタリングが自動起動した: enable した unit を disable し、原因を Issue に書く。

```bash
ssh s1 'systemctl disable --now prometheus grafana-server node_exporter process-exporter 2>/dev/null || true'
```

# 完了条件

- 再起動後のアプリケーションと依存サービスが正常である。
- 再起動直前に見えていた Web ページの内容が残っており、欠損がない。
- 変更漏れや手動作業への依存がない。

