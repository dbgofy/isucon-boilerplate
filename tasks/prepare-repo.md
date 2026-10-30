---
title: "競技用リポジトリを準備する"
milestone: "01 事前準備"
labels:
  - type:task
  - type:documentation
depends_on: []
---

# 目的

競技開始前に、コードとサーバー状態を記録できる GitHub リポジトリを準備する。

# 前提条件

- `gh` でこのリポジトリを操作できる。
- メンバー追加はユーザーが許可したアカウントだけにする。

# 対象サーバー

なし。GitHub と手元の作業。

# 作業

- リポジトリの公開範囲とメンバー権限を確認する。
- default branch と Issues の有効状態を確認する。報告先で Issues が無効なら、管理権限・ユーザーの許可範囲を確認してから有効化する。
- Pull Request の更新提案、head branch の自動削除など、運用に必要なリポジトリ設定を確認する。
- `README.md`、`tasks/` の運用方針を確認する。
- 競技開始前に公開済みの情報だけで完了を判定する。サーバー情報は `prepare-local-access.md`、鍵配布の規則は `read-regulation.md` / `read-manual.md`、適用は `initialize-servers.md` で扱う。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
REPO=OWNER/REPOSITORY
```

## 1. 公開範囲、default branch、権限を確認する

```bash
gh repo view "$REPO" --json name,visibility,defaultBranchRef,url,isPrivate
gh api "repos/${REPO}" --jq '{default_branch,has_issues,allow_squash_merge,allow_rebase_merge,allow_merge_commit,delete_branch_on_merge,allow_update_branch}'
gh api "repos/${REPO}/collaborators" --jq '.[] | {login,role_name}'
```

## 2. メンバーを招待する

ユーザーが Organization でメンバー設定済みと明示した場合は再確認・個別招待を省略し、その根拠を記録する。SSH 鍵更新 workflow の実行は競技開始後の初期化で扱う。

```bash
# 権限はユーザー指定。未指定なら確認する。
# organization レベルで権限がある場合は招待しない。
# gh api -X PUT "repos/${REPO}/collaborators/LOGIN" -f permission=push
```

## 3. PR 運用に必要な設定を確認する

```bash
gh api "repos/${REPO}" --jq '{allow_update_branch,delete_branch_on_merge,allow_squash_merge}'
# 足りなければ有効化する
gh api -X PATCH "repos/${REPO}" \
  -F allow_update_branch=true \
  -F delete_branch_on_merge=true \
  --jq '{allow_update_branch,delete_branch_on_merge}'
```

## 4. 運用文書を確認する

```bash
cat README.md
cat tasks/README.md
git branch -vv
git remote -v
```

## 5. 接続情報の受け取り欄を Issue に用意する

競技開始後の接続設定 Issue で受け取る情報の欄を用意してよい。未公開の欄は「開始後に受領」と記録し、このタスクの完了を妨げない。

```bash
gh issue comment "$ISSUE" --body "$(cat <<'EOF'
## 受け取り情報

- サーバー一覧:
- 役割:
- SSH ユーザー / 鍵:
- ベンチマークポータル:
EOF
)"
```

# 確認方法

```bash
gh repo view "$REPO"
gh api "repos/${REPO}/collaborators" --jq '.[].login'
```

# 失敗時の復旧

- `gh` が 403: ログインと repo 権限を確認する。`gh auth status`
- メンバー招待ができない: リポジトリ管理者へ依頼する。権限を推測で上げない。

# 完了条件

- チームメンバーがリポジトリを利用できる。
- リポジトリの権限と PR 運用設定が確認できている。未公開の接続情報、鍵配布方法、今すぐ不要な workflow の問題を未完了理由にしない。
- 競技開始後に初期準備 Issue を作成できる。

