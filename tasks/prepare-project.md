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
- 「すべて」「着手可能」「人間の操作が必要」の3つの保存済み Board ビューをこの順で用意する。共通設定は Column by: Status、Swimlanes: Milestone、Sort by: manual、Field sum: Count、Slice by: none とし、ビュー間ではフィルターだけを変える。
- 表示フィールドは Title / Assignees / Status / Labels / Linked pull requests / Sub-issues progress を共通にする。参照ビューの指定がある場合は実際の表示フィールドを確認して合わせる。
- GraphQL API で作成・更新できる項目は API で設定し、現行スキーマで対応しない表示設定と自動追加だけ UI で補う。CLI の機能不足だけで API も未対応と判断しない。
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

## 3. GraphQL API でビューを作成・更新する

`gh api graphql` から Project・ビューを操作できる。実行時の公開スキーマを確認し、取得した ID を使う。既存ビューを名前・内容で照合し、再実行で重複作成しない。owner / repository / Project / field / view / item / Status option の ID を推測・固定しない。

| 操作 | GraphQL mutation / 取得項目 |
| --- | --- |
| Project の作成・リンク | `createProjectV2` / `linkProjectV2ToRepository` |
| Issue / PR の登録 | `addProjectV2ItemById` |
| ビューの作成 | `createProjectV2View` の `name` / `layout: BOARD_LAYOUT` / `configuration.visibleFieldIds` |
| ビューの更新 | `updateProjectV2View` の `viewId` / `name` / `layout` / `filter` / `configuration.visibleFieldIds` |
| Status の更新 | `updateProjectV2ItemFieldValue` と実在する single-select option ID |
| 設定の再取得 | `ProjectV2.views` の `name` / `layout` / `filter` / `fields` / `groupByFields` / `verticalGroupByFields` / `sortByFields` |

作成時の戻り値は `projectV2View`。作成入力に `filter` がない版では、作成後に `updateProjectV2View` で保存する。`visibleFieldIds` は表示順を含むため、3ビューへ同じ配列を指定する。

```bash
# 実行時の入力項目を確認する
# 同様に CreateProjectV2ViewInput / UpdateProjectV2ViewInput も確認する
gh api graphql -f query='{ __type(name:"ProjectV2ViewConfigurationInput") { inputFields { name } } }'

# VIEW_ID は作成・取得した実 ID
VIEW_ID=REPLACE
gh api graphql -f viewId="$VIEW_ID" -f filter='is:open -is:blocked -label:needs-user-action' -f query='
mutation($viewId: ID!, $filter: String!) {
  updateProjectV2View(input: {viewId: $viewId, filter: $filter}) {
    projectV2View { id number name layout filter }
  }
}'
```

| ビュー | 保存する filter |
| --- | --- |
| すべて | 空文字（全 Issue / PR） |
| 着手可能 | `is:open -is:blocked -label:needs-user-action` |
| 人間の操作が必要 | `is:open label:needs-user-action` |

`is:blocked` は GitHub Issue dependency による未完了依存先を扱う。sub-issue の親子関係で代用しない。フィルターが保存できただけで完了にせず、完了済み・依存待ち・人間の操作待ちの実項目で表示・除外を確認する。未対応なら理由を記録して未完了にする。

## 4. Swimlanes と共通表示を保存する

公開スキーマの `ProjectV2ViewConfigurationInput` が `visibleFieldIds` のみの場合、Swimlanes などはその入力では変更できない。未公開 API や推測したパラメーターは使わず UI で補う。API が拡張された場合は実スキーマに従う。

各ビューで View → Swimlanes → Milestone を選び、Column by: Status、Sort by: manual、Field sum: Count、Slice by: none と共通の表示フィールドを確認する。Save view → 確認ダイアログの Save まで実行し、再読込後に Milestone レーンと設定の保存を確認する。自分の一時表示だけを変更して完了にしない。

「すべて」を完成させて複製する方法でもよい。既存ビューを更新する場合も3ビューの表示設定をそろえ、不要なビューを無断で削除しない。作成先 Project と各ビュー URL、実際の filter、API / UI で確認した範囲を Issue に記録する。

## 5. 自動追加を確認する

GitHub の Project 設定で、このリポジトリの Issue / PR を自動追加する workflow の対象・filter・enabled を確認する。公開 API に作成・更新機能がなければ UI で設定する。`ProjectV2.workflows` の name / enabled だけで対象リポジトリと filter まで確認できたことにしない。Auto-add sub-issues は全 Issue / PR の自動追加の代わりにならない。

```bash
gh project view "$PROJECT_NUMBER" --owner "$OWNER"
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

- 3つの Board ビューが指定順で保存され、共通の表示設定・Milestone レーン・表示フィールドと各 filter の表示・除外を確認済み。
- API 更新後の再取得と UI 再読込で設定が保存され、自動追加の対象・filter・enabled を確認済み。未確認やユーザー操作待ちが残っていない。

- チームメンバーが Project を利用できる。
- 新しく作成した Issue と Pull Request を Project で管理できる。

