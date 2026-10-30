---
title: "通知用 token を revoke する"
milestone: "07 競技終了後"
labels:
  - type:security
  - type:task
depends_on:
  - final-benchmark.md
---

# 目的

競技中に発行した token や deploy key を無効化し、不要な権限を残さない。連絡は GitHub の Issue / Pull Request を使うため、通知用 webhook は対象にしない。

# 前提条件

- 発行時の一覧は `prepare-communication.md` と初期セットアップの Issue 記録を正とする。
- 運営管理の認証情報は消さない。

# 対象サーバー

deploy key を置いた競技サーバー。

# 作業

- 発行した token、deploy key の一覧を確認する。
- 不要なものを revoke または削除する。
- 実施日時と対象を記録する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
REPO=OWNER/REPOSITORY
```

## 1. 発行物を一覧する

```text
- GitHub deploy key:
- 追加で発行した PAT / token:
```

```bash
gh repo deploy-key list --repo "$REPO"
```

## 2. deploy key が不要なら削除する

競技終了後にサーバーからの push が不要なら削除する。残す場合は理由を書く。

```bash
gh repo deploy-key list --repo "$REPO"
# gh repo deploy-key delete KEY_ID --repo "$REPO"
```

# 確認方法

```bash
gh repo deploy-key list --repo "$REPO"
```

# 失敗時の復旧

- 発行元が分からない: 未実施として Issue に残す。
- 誤って必要な key を消した: サーバーで公開鍵を再表示し、deploy key を再登録する。

```bash
ssh s1 'cat /root/.ssh/id_rsa.pub'
```

# 完了条件

- 競技用に発行した不要な token が無効化されている。
- 未実施の対象がある場合は、その理由が記録されている。

