---
title: "GitHub Project を準備する"
labels:
  - phase:day-before
  - type:task
  - type:documentation
depends_on:
  - prepare-repo.md
---

# 目的

競技中の Issue と Pull Request を整理できる GitHub Project を準備する。

# 前提条件

- `gh` でこのリポジトリの Project を作成できる。

# 対象サーバー

なし。

# 作業

- 対象リポジトリに Project を作成または追加する。
- Issue と Pull Request の自動追加設定を確認する。
- phase/type label で絞り込めることを確認する。
- Project の運用方法をチーム内で共有する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
REPO=OWNER/REPOSITORY
OWNER=OWNER
```

## 1. 既存 Project を確認する

```bash
gh project list --owner "$OWNER" --limit 20
gh label list --repo "$REPO"
```

## 2. 無ければ作成し、リポジトリへリンクする

```bash
gh project create --owner "$OWNER" --title "REPOSITORY"
# 表示された number を使う
PROJECT_NUMBER=REPLACE
gh project link "$PROJECT_NUMBER" --owner "$OWNER" --repo "$REPO"
```

## 3. 自動追加を確認する

GitHub の Project 設定で、このリポジトリの Issue / Pull Request を自動追加する workflow があることを確認する。CLI で作れない項目は UI で設定し、設定内容を Issue に書く。

```bash
gh project view "$PROJECT_NUMBER" --owner "$OWNER"
```

## 4. label で絞り込めることを確認する

```bash
gh issue list --repo "$REPO" --label 'phase:day-before' --limit 5
gh issue list --repo "$REPO" --label 'type:infrastructure' --limit 5
```

# 確認方法

```bash
gh project list --owner "$OWNER"
gh project view "$PROJECT_NUMBER" --owner "$OWNER" --web
```

チームメンバーが Project を開けること。

# 失敗時の復旧

- `gh project create` が 403: organization の Project 権限を確認する。
- 自動追加できない: 手動で `gh project item-add` するか、UI の workflow を設定する。

```bash
# 必要なら個別追加
# gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url https://github.com/OWNER/REPOSITORY/issues/N
```

# 完了条件

- チームメンバーが Project を利用できる。
- 新しく作成した Issue と Pull Request を Project で管理できる。

