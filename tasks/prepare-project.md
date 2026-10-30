---
title: "GitHub Project を準備する"
needs-user-action: true
milestone: "01 事前準備"
labels:
  - type:task
  - type:documentation
depends_on: []
---

# 必要な情報

必要な情報: 対象リポジトリ・Project、作成・編集の権限、自動追加設定をユーザーが UI で行うか。既に提供・許可された内容は再質問しない。秘密情報の値は書かない。

# 目的

競技中の Issue と Pull Request を整理できる GitHub Project を準備する。

# 前提条件

- 一覧には `read:project`、編集には `project` 相当の権限が必要。`gh auth status` と実操作で確認し、不足時だけユーザーに認証更新を依頼する。token の値は共有しない。

- `gh` でこのリポジトリの Project を作成できる。

# 対象サーバー

なし。

# 作業

- CLI/API で作成・リンク・既存 Issue/PR の登録を行い、UI が必要な設定を分ける。ユーザー操作待ちは `needs-user-action` を付け、完了報告・設定内容を確認するまで未完了にする。
- Auto-add to project は対象リポジトリと `is:issue,pr is:open` 等のフィルター、enabled 状態を確認し、設定内容または画像を Issue に残す。Auto-add sub-issues だけで全 Issue/PR の自動追加済みと判定しない。
- 着手時に対象 Project item の Status を In Progress に更新する。完了時は Issue の close と Done の両方を確認する。Auto-add は着手状態を更新しない。

- Project を作成する。リポジトリの準備状況に応じて、対象リポジトリへリンクする。
- Issue と Pull Request の自動追加設定を確認する。
- Milestone 列と時期別の保存済みビューを用意し、type label と併用する。
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

## 4. Milestone と type label で絞り込めることを確認する

```bash
gh issue list --repo "$REPO" --milestone '01 事前準備' --limit 5
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

- Milestone 列・時期別ビュー、自動追加の対象と有効状態を確認し、ユーザー操作待ちが残っていない。

- チームメンバーが Project を利用できる。
- 新しく作成した Issue と Pull Request を Project で管理できる。

