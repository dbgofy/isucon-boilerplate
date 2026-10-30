---
title: "競技中の連絡手段と通知を準備する"
needs-user-action: true
milestone: "01 事前準備"
labels:
  - type:task
  - type:infrastructure
depends_on:
  - prepare-repo.md
---

# 必要な情報

必要な情報: Discord の通知先サーバー・チャンネル、GitHub リポジトリ、各メンバーの受信確認状況、明示的に省略する項目。既存の設定や認証済み MCP / API から取得できる情報は再質問しない。Webhook URL、Bot Token などの秘密情報は Issue に記録しない。

# 目的

競技中の担当、障害、ベンチマーク結果を GitHub の Issue / Pull Request / comment で共有し、その更新を Discord の専用チャンネルに通知する。GitHub を情報の正とし、競技サーバーには通知スクリプトを置かない。

# 前提条件

- GitHub リポジトリが作成されている。
- Discord の通知先を決められること。通知先が未定ならユーザーに確認する。
- Discord の Webhook 作成と GitHub の Webhook 管理に必要な権限があること。MCP や API で操作できなければ、ユーザーに権限付与または手動操作を依頼する。

# 対象サーバー

なし。

# 作業

- 運営指定の連絡手段はレギュレーションで別に確認する。
- ベンチマーク結果、デプロイ、障害は対象 Issue / Pull Request に記録する。Discord は通知先として使用する。
- Discord に GitHub 通知専用チャンネルを作成または選択し、通常の会話と分ける。
- 利用可能な Discord MCP が Webhook の作成・取得に対応するか確認する。対応しなければ適切な権限（Manage Webhooks）を持つ Discord Bot と API を利用する。Webhook URL のみでは新規 Webhook を作成できない。
- Discord の Webhook URL を取得し、GitHub の Webhook 設定に末尾 `/github` を追加して登録する。GitHub API または利用可能な GitHub MCP を使い、`application/json`、SSL 検証有効、Active 有効、Secret 空欄とする。
- 通知イベントは Issue、Pull Request、Issue comments、Pull request reviews、Pull request review comments を基本とし、Push と Workflow runs は必要に応じて追加する。
- GitHub の Recent Deliveries と Discord の投稿でテストする。実際の送信先 URL が `/github` で終わっていることも確認する。
- チーム全員が GitHub の Issue / Pull Request にアクセスでき、Discord の通知を閲覧できることを確認する。受信済みかどうかは本人の確認を取る。明示的に省略する場合はその範囲と理由を記録する。
- 通知先、対象イベント、テスト結果を Issue に記録する。Webhook URL や認証情報は書かない。

## 実行例

コマンドは実行例であり、環境に合わせて読み替える。API 操作に必要な認証情報は秘密情報ストアなどで安全に扱い、ログや Issue に出力しない。

```bash
REPO=OWNER/REPOSITORY
# 既に安全に取得した Discord Webhook URL を利用する
gh api "repos/$REPO/hooks" -f name=web -F active=true \
  -f 'events[]=issues' -f 'events[]=pull_request' \
  -f 'events[]=issue_comment' -f 'events[]=pull_request_review' \
  -f 'events[]=pull_request_review_comment' \
  -f "config[url]=${DISCORD_WEBHOOK_URL%/}/github" \
  -f 'config[content_type]=json' -f 'config[insecure_ssl]=0'
```

## 1. 通知を確認する

GitHub の Webhooks → Recent Deliveries で送信結果を確認する。Discord の専用チャンネルで Issue / Pull Request の通知を確認する。必要ならテスト用 Issue comment を投稿する。

```bash
gh issue comment "$ISSUE" --repo "$REPO" --body "通知テスト"
```

# 確認方法

- GitHub の Recent Deliveries で送信が成功している。
- Discord の専用チャンネルにテスト通知が届いている。
- チーム全員のアクセスと通知受信を確認したか、ユーザーが明示した省略を記録した。
- Webhook URL や Bot Token を Issue / PR / ログに露出していない。

# 失敗時の復旧

- HTTP 400: Recent Deliveries の Request URL が `/github` で終わるか、Content type が `application/json` か確認し、設定保存後に Redeliver する。
- HTTP 404: Webhook の削除・失効を確認する。
- 通知が届かない: GitHub のイベント選択、Recent Deliveries のレスポンス、Discord のチャンネル権限を確認する。
- 秘密情報が露出した: Discord Webhook を再発行し、GitHub の設定を更新する。
- 共有先が分散する: 用途ごとの Issue を決め、以降はその Issue に記録する。

# 完了条件

- GitHub の共有先と Discord の通知先が決まっている。
- GitHub のイベントが Discord に届くことを確認した。
- チーム全員の受信を確認した、または明示的な省略範囲と理由を記録した。

# 参考

- 実施例: https://github.com/dbgofy/isucon14-20261030/issues/38
