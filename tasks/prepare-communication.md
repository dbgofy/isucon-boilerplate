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

# ユーザー確認

1. 実行する（必要情報を提供する）
2. 今回は実行しない（未完了のまま保留する）
3. 手順だけ作成する（実機・外部サービスには触れない）

必要な情報: 通知の共有先、各メンバーの受信確認状況、今回明示的に省略する項目。既に提供・許可された内容は再質問しない。秘密情報の値は書かない。

# 目的

競技中の担当、障害、ベンチマーク結果を GitHub で共有できるようにする。通知は Issue / Pull Request / comment に対する GitHub の通知を使う。サーバーへ webhook や通知スクリプトは置かない。

# 前提条件

- 連絡手段は GitHub を正とする。
- 追加の webhook や bot token は発行しない。

# 対象サーバー

なし。

# 作業

- 共有先の決定と、各メンバー本人の通知受信確認を分ける。Organization の権限設定だけで受信済みと推定しない。
- 運営指定の連絡手段はレギュレーションで別に確認し、チーム内 GitHub 通知と混同しない。
- ユーザーが今回の受信確認の省略を明示した場合は、その範囲と判断を記録する。返答待ちを確認済みとはしない。

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

- チーム全員の通知受信を確認した、またはユーザーが明示した省略範囲と理由を記録した。
- 共有先の Issue / Pull Request が決まっている。

