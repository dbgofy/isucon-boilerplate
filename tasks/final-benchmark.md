---
title: "提出用の最終ベンチマークを実行する"
milestone: "06 競技終盤"
labels:
  - type:performance
  - type:validation
depends_on:
  - reboot-final.md
---

# 目的

凍結した最終状態のスコアと動作結果を確定する。

# 前提条件

- BENCH_ID は実 Job ID と環境識別から一意にする。再作成で Job ID がリセットされても既存 Release を上書きしない。

- 計測機能は無効化済み。
- ベンチマークの実行方法はマニュアル / ポータルを正とする。
- 実測していないスコアを書かない。

# 対象サーバー

提出対象として凍結した構成。

# 作業

ユーザーの指示がない限り、Issue コメントや Project 更新などを待たずベンチマークを開始し、記録・更新は並行する。

- 最終 commit と対象サーバーを記録する。
- ベンチマーク条件を記録する。
- 提出用ベンチマークを実行する。
- スコア、エラー、ログ、実行日時を保存する。
- スコアと結果を Pull Request に記載する。
- default branch で実行した各ベンチマークについて、実行時の exact commit を target とする GitHub Release を作成する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
DIR="/tmp/isucon-work/${STAMP}-final"
mkdir -p "$DIR"
SERVERS=(s1 s2 s3)
```

## 1. 最終 commit と条件を記録する

```bash
{
  echo "stamp=$STAMP"
  echo "commit=$(ssh s1 'git -C / rev-parse HEAD')"
  echo "branch=$(ssh s1 'git -C / rev-parse --abbrev-ref HEAD')"
  echo "servers=${SERVERS[*]}"
} | tee "$DIR/meta.txt"
for s in "${SERVERS[@]}"; do
  ssh "$s" 'git -C / rev-parse HEAD; git -C / status -sb' | tee "$DIR/${s}-git.txt"
done
```

## 2. 提出用ベンチマークを実行する

ポータルまたはマニュアル記載の方法で実行する。コマンドは確認した原文を使う。

```bash
# ポータルで実行した場合は開始時刻と job id を meta に追記する
date -Is | tee -a "$DIR/meta.txt"
```

## 3. 結果を保存する

```bash
# スコアとエラーはポータル出力から転記する。捏造しない。
tee -a "$DIR/score.txt" <<'EOF'
score=
errors=
fail=
EOF
```

必要なログがあれば取得する。大きい場合は Git に入れず Release か Issue にリンクする。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'sudo tail -n 100 /var/log/nginx/error.log 2>/dev/null || true' > "$DIR/${s}-nginx-error.txt"
done
```

## 4. Pull Request または Issue に書く

```bash
gh issue comment "$ISSUE" --body "$(cat <<EOF
## 最終ベンチマーク ${STAMP}

\`\`\`
$(cat "$DIR/meta.txt")
$(cat "$DIR/score.txt")
\`\`\`

- 提出可否:
- 残課題:
- 保存先: \`$DIR\`
EOF
)"
```

## 5. GitHub Release を作成する

最終ベンチマークごとに、実行時に記録した default branch の exact commit をtargetにしてReleaseを作成する。failした場合も、スコア欄を実測どおり `fail` または `0` として記録し、Releaseを省略しない。

```bash
TARGET_COMMIT=$(grep '^commit=' "$DIR/meta.txt" | cut -d= -f2)
TAG="bench-${BENCH_ID}"
gh release create "$TAG" \
  --repo "$REPO" \
  --target "$TARGET_COMMIT" \
  --title "final ${STAMP} score ${SCORE}" \
  --notes "$(cat <<EOF
- 種別: 最終ベンチマーク
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
cat "$DIR/meta.txt" "$DIR/score.txt"
```

スコア欄が実測値または「失敗」であること。

# 失敗時の復旧

- 実行できない: フリーズ解除はチーム合意のうえ。失敗ログを `$DIR` に残す。
- スコアが空: 空のままにし、ポータルのスクショや HTML を `$DIR` へ保存する。数値を補完しない。

# 完了条件

- 最終スコアが実測値として記録されている。
- 提出可否と残課題がチーム内で共有されている。

