---
title: "初期状態のベースラインを計測する"
needs-user-action: true
labels:
  - phase:early-competition
  - type:performance
  - type:experiment
depends_on:
  - initialize-servers.md
---

# 目的

改善前の性能とエラー状況を計測し、後続の判断基準を作る。

# 前提条件

- ベンチマークの実行方法はマニュアル / ポータルを正とする。推測で負荷をかけない。
- 実測していない値を書かない。

# 対象サーバー

ベンチ対象として Issue に記録した構成。

# 作業

- ベンチマーク条件と対象構成を記録する。
- 初期状態でベンチマークを実行する。
- スコア、エラー、レイテンシ、CPU、メモリ、I/O、DB 指標を保存する。
- 実行日時と commit を記録する。
- Issue と Pull Request に結果を記載する。
- default branch で実行した各ベンチマークについて、実行時の exact commit を target とする GitHub Release を作成する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
DIR="/tmp/isucon-work/${STAMP}-baseline"
mkdir -p "$DIR"
SERVERS=(s1 s2 s3)
```

## 1. 条件を記録する

```bash
{
  echo "stamp=$STAMP"
  echo "commit=$(ssh s1 'git -C / rev-parse HEAD')"
  echo "servers=${SERVERS[*]}"
  echo "condition: 初期状態。変更内容は Issue に書く。"
} | tee "$DIR/meta.txt"
```

## 2. 計測直前にログを切る

`prepare-logrotate.md` の手順がある場合はそれを使う。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'cd / && make rotate-logs' || true
done
```

## 3. ベンチマークを実行する

ポータルまたはマニュアル記載の方法で実行する。実行コマンドは確認した原文を Issue に貼る。

```bash
# 例: ポータル上で Start する
# 例: 運営配布の bench バイナリを指定オプションで実行する
```

## 4. スコアと資源状況を保存する

スコアはポータルまたは bench 出力から転記する。捏造しない。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'bash -s' <<'EOF' > "$DIR/${s}-sar.txt"
hostname
date -Is
uptime
free -h
df -h
ss -s
nproc
ps aux --sort=-pcpu | head -n 20
EOF
done
```

アクセスログ集計がある場合はベンチ後に取る。

```bash
ssh s1 'sudo alp ltsv --file /var/log/nginx/access.log --sort sum -r | head -n 40' \
  > "$DIR/alp.txt" || true
```

## 5. Issue に結果を書く

```bash
gh issue comment "$ISSUE" --body "$(cat <<EOF
## ベースライン ${STAMP}

\`\`\`
$(cat "$DIR/meta.txt")
\`\`\`

- スコア: （ポータルの実測値）
- エラー:
- 保存先: \`$DIR\`
- 成功 / 失敗:
EOF
)"
```

## 6. GitHub Release を作成する

ベンチマークごとに、実行時に取得した default branch の exact commit を target にしてReleaseを作成する。スコアが0点またはfailでもReleaseを省略しない。ベースラインであることを明記し、最終結果として扱わない。

```bash
TARGET_COMMIT=$(ssh s1 'git -C / rev-parse HEAD')
TAG="baseline-${STAMP}-score-${SCORE}"
gh release create "$TAG" \
  --repo "$REPO" \
  --target "$TARGET_COMMIT" \
  --title "baseline ${STAMP} score ${SCORE}" \
  --notes "$(cat <<EOF
- 種別: ベースライン
- 実行日時: ${STAMP}
- 対象 commit: ${TARGET_COMMIT}
- 対象サーバー: ${SERVERS[*]}
- 条件: Issue を参照
- スコア: ${SCORE}
- エラー: ${ERRORS}
- 関連 Issue: #${ISSUE}
EOF
)"
```

# 確認方法

```bash
ls -l "$DIR"
cat "$DIR/meta.txt"
```

# 失敗時の復旧

- ベンチが開始できない: ポータルと initialize 要否をマニュアルで再確認する。アプリを推測で叩かない。
- 途中失敗: 失敗時点のログを `$DIR` に残し、スコア欄は空または「失敗」と書く。

# 完了条件

- 再比較できるベースラインが保存されている。
- 実測していない値を記載していない。

