---
title: "GitHub の通知を Discord に流す"
needs-user-action: true
milestone: "01 事前準備"
labels:
  - type:task
  - type:infrastructure
depends_on:
  - prepare-repo.md
---

# 必要な情報

必要な情報: 通知先 Discord サーバー・チャンネル、GitHub リポジトリの Webhook 設定権限、通知対象イベント。Webhook URL やトークンの値は Issue に記録しない。

# 目的

GitHub の Issue、Pull Request、レビュー、コメントなどの更新を Discord の専用チャンネルに通知し、チームが進捗を把握できるようにする。GitHub の Issue / Pull Request を情報の正とし、Discord は通知先として使う。

# 前提条件

- GitHub リポジトリと Discord サーバーが用意されている。
- GitHub の Webhook 設定と Discord の Webhook 作成を行える権限がある。

# 対象サーバー

なし。

# 作業

- GitHub 通知専用の Discord チャンネルを作成または選択する。通常の会話チャンネルと分ける。
- Discord のチャンネル設定から Webhook を作成し、URL を安全に取り扱う。
- GitHub の Settings → Webhooks で Payload URL に Discord の Webhook URL の末尾へ `/github` を付けたものを設定する。
- Content type は `application/json`、SSL verification は有効、Active は有効にする。Discord の GitHub 互換 Webhook では Secret を空欄にする。
- 通知対象のイベントを選ぶ。まず Issue、Pull Request、レビュー、コメントを優先し、Push や Workflow runs は必要に応じて追加する。
- テスト用イベントを発生させ、GitHub の Recent Deliveries と Discord の投稿を確認する。
- 通知先チャンネルと選択イベントを Issue に記録する。Webhook URL やトークンは記録しない。

# 確認方法

- GitHub の Recent Deliveries で送信が成功している。
- Discord の専用チャンネルに Issue / Pull Request の通知が届く。
- チームメンバーが通知を閲覧できる。

# 失敗時の復旧

- `400 Bad Request`: Recent Deliveries の Request URL が `/github` で終わっているか確認し、設定保存後に Redeliver する。
- `404` や認証エラー: Webhook が削除・再発行されていないか確認する。
- 通知が届かない: GitHub のイベント選択、Recent Deliveries のレスポンス、Discord のチャンネル権限を確認する。
- Webhook URL がログや公開 Issue に露出した場合は、Discord 側で Webhook を再発行して GitHub の設定を更新する。

# 完了条件

- 通知専用チャンネルと対象イベントが決まっている。
- GitHub のイベントが Discord に正常に投稿されることを確認した。
- 設定内容と受信確認を Issue に記録し、秘密情報を記録していない。

# 参考

- 実施例: https://github.com/dbgofy/isucon14-20261030/issues/38
