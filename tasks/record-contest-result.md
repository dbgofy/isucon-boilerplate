---
title: "競技結果を GitHub Release に記録する"
labels:
  - phase:after-competition
  - type:documentation
  - type:task
depends_on:
  - final-benchmark.md
---

# 目的

default branch で実行したベンチマークごとに、実行時の状態、スコア、変更内容、判断の根拠を GitHub Release として残す。

# 前提条件

- 実行時の default branch の exact commit を正とする。
- 実測していないスコアや結果を補完しない。

# 対象サーバー

なし。GitHub 上の記録作業。

# 作業

- ベンチマーク実行時の default branch commit を確認する。
- タイムスタンプとスコアを含む名前で GitHub Release を作成する。
- ベースライン、比較計測、提出用、成功、失敗を問わず、ベンチマークごとにReleaseを作成する。
- 変更内容の要約を記載する。
- 関連 Issue と Pull Request へのリンクを記載する。
- ベンチマーク結果、既知の問題、未実施の計測を記録する。
- 実測していないスコアや結果を補完しない。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
REPO=OWNER/REPOSITORY
BRANCH=master
SCORE=REPLACE_WITH_MEASURED_SCORE
STAMP=$(date +%Y%m%d-%H%M%S)
TAG="${STAMP}-${SCORE}"
```

## 1. 対象 commit を確認する

```bash
 # 計測時に保存した SHA を指定する
TARGET_COMMIT=REPLACE_WITH_RECORDED_COMMIT
git fetch origin
git show -s --oneline "$TARGET_COMMIT"
git status
```

## 2. GitHub Release を作成する

```bash
gh release create "$TAG" \
  --repo "$REPO" \
  --target "$TARGET_COMMIT" \
  --title "${STAMP} score ${SCORE}" \
  --notes "$(cat <<EOF
## 要約

- スコア: ${SCORE}（実測。ベースラインか最終結果かを明記）
- 対象 commit: ${TARGET_COMMIT}

## 関連

- Issue:
- Pull Request:

## ベンチマーク

- 実行日時:
- 対象サーバー:
- 実行条件:
- ベンチマーク種別: ベースライン / 比較計測 / 最終
- 結果の保存先:

## 既知の問題 / 未実施の計測

- 
EOF
)"
```

計測ログを付ける場合は、秘密情報を含まないファイルだけを asset にする。

```bash
# gh release upload "$TAG" /tmp/isucon-work/YYYYMMDD-HHMMSS-final/score.txt --repo "$REPO"
```

# 確認方法

```bash
gh release view "$TAG" --repo "$REPO"
```

# 失敗時の復旧

- tag が衝突する: `${STAMP}` を含めた名前で作り直す。
- スコア未確定: GitHub Release を作らず、実測結果を取得してから実行する。fail時は実測どおり `fail` または `0` を記録し、仮の数値で tag しない。

# 完了条件

- GitHub Release から対象 commit、変更内容、関連 Issue・PR、スコアを確認できる。
- 推測や未確認事項が明示されている。
