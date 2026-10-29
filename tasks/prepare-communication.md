---
title: "競技中の連絡手段と通知を準備する"
labels:
  - phase:day-before
  - type:task
  - type:infrastructure
depends_on:
  - prepare-repo.md
---

# 目的

競技中の担当、障害、ベンチマーク結果を GitHub で共有できるようにする。通知は Issue / Pull Request / comment に対する GitHub の通知を使う。サーバーへ webhook や通知スクリプトは置かない。

# 前提条件

- 連絡手段は GitHub を正とする。
- 追加の webhook や bot token は発行しない。

# 対象サーバー

なし。

# 作業

- チーム全員がリポジトリの通知を受け取れることを確認する。
- ベンチマーク結果、デプロイ、障害の共有先を Issue / Pull Request に決める。
- サーバー上のログや作業結果も GitHub に書いて共有する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
REPO=OWNER/REPOSITORY
```

## 1. 通知設定を確認する

チーム全員がリポジトリを Watch するか、参加 Organization の通知設定で Issue / Pull Request を受け取れることを確認する。モバイルアプリやメールの受信も確認する。

```text
- 連絡先: このリポジトリの Issue / Pull Request
- ベンチマーク結果の共有先: 対象 Issue / Pull Request
- デプロイ / 障害の共有先: 対象 Issue / Pull Request
```

## 2. テスト通知する

テスト用の Issue comment を書き、チーム全員に通知が届くことを確認する。

```bash
gh issue comment "$ISSUE" --repo "$REPO" --body "通知テスト"
```

# 確認方法

- チーム全員が Issue / Pull Request を開ける。
- テスト comment の通知が届く。

```bash
gh issue view "$ISSUE" --repo "$REPO" --comments
```

# 失敗時の復旧

- 通知が届かない: GitHub の Watch 設定、メール、モバイルアプリの通知許可を確認する。
- 共有先が分散する: 用途ごとの Issue を決め、以降はその Issue に書く。

# 完了条件

- チーム全員が GitHub の通知を受け取れる。
- 共有先の Issue / Pull Request が決まっている。

