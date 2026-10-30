---
title: "振り返りを公開する"
milestone: "07 競技終了後"
labels:
  - type:documentation
  - type:task
depends_on:
  - record-contest-result.md
---

# 目的

最終スコア、うまくいったこと、次に残す課題を、実測に基づいて残す。

# 前提条件

- Release、Issue、Pull Request の記録を正とする。
- 秘密情報、未公開の解答、未確認の数値を書かない。
- 練習では同じ問題の公開解答を参照しない。本番では未公開の同一問題解答を参照しない。

# 対象サーバー

なし。

# 作業

- Release、Issue、Pull Request から変更内容と計測結果を集める。
- スコア、実施した変更、失敗した試みを、事実と仮説に分けて書く。
- 秘密情報、未公開の解答、未確認の数値を書かない。
- 公開先と URL を Issue に記録する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
REPO=OWNER/REPOSITORY
```

## 1. 一次情報を集める

```bash
gh release list --repo "$REPO" --limit 20
gh issue list --repo "$REPO" --state all --limit 50
gh pr list --repo "$REPO" --state all --limit 50
```

スコアは Release、Issue、Pull Request に記録された実測値だけ使う。手元の一時ファイルだけにある値は、正式記録へ転記して確認できるまで使わない。

## 2. 公開文を書く

公開先はチームで決める（リポジトリの Markdown、ブログ、社内 Wiki など）。文中では事実と仮説を分ける。

```markdown
# 振り返り

- 公開日:
- 最終スコア: （実測）
- 対象 Release:

## 実施した変更（事実）

## 計測結果（事実）

## うまくいったこと

## 失敗した試み

## 仮説 / 次に残す課題
```

## 3. 公開 URL を Issue に記録する

```bash
mkdir -p /tmp/isucon-work/retrospective
cat > /tmp/isucon-work/retrospective/comment.md <<'EOF'
- 公開先 URL:
- 公開範囲:
- 使った一次情報（Release / Issue / PR）:
EOF
gh issue comment "$ISSUE" --body-file /tmp/isucon-work/retrospective/comment.md
```

# 確認方法

- 公開文に秘密鍵、token、未公開 IP、未確認スコアが無い。
- スコアが Release の値と一致する。

```bash
gh release view --repo "$REPO"
```

# 失敗時の復旧

- 秘密情報を書いてしまった: 公開を取り下げ、token は `revoke-tokens.md` に戻る。
- 数値が一次情報と違う: 公開文を実測値へ直す。記憶で補完しない。

# 完了条件

- 振り返りの公開先が記録されている。
- 実測していないスコアや結果を書いていない。

