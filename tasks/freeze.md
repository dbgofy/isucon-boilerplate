---
title: "変更を凍結する"
milestone: "06 競技終盤"
labels:
  - type:deployment
depends_on:
  - disable-instrumentation.md
---

# 目的

以降のコード変更を止め、提出用の最終状態を固定する。

再起動試験は `reboot-final.md` で行う。凍結 commit は Issue のコメントと、`record-contest-result.md` の GitHub Release に残す。

# 前提条件

- `reboot-3.md` まで完了している。
- 計測機能は無効化済みである。
- 以降のコード変更を止める合意がある。問題が出たらフリーズを解除して Issue / PR に書く。

# 対象サーバー

Issue に記録した全競技サーバー。

# 作業

- 変更をフリーズする。
- 各サーバーの commit と git status を確認する。
- 未コミットの変更がないことを確認する。
- 凍結 commit を Issue に記録する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
```

## 1. 凍結する commit を確認する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'hostname; git -C / rev-parse HEAD; git -C / status -sb'
done
```

未コミットの変更があれば freeze しない。commit してからやり直す。

# 確認方法

全サーバーの HEAD が一致し、作業ツリーが dirty でないこと。

# 失敗時の復旧

- dirty がある: 意図した変更だけ commit するか、破棄してから再確認する。
- サーバー間で commit が違う: `git pull` で揃えてから再確認する。
- 問題が出た: フリーズを解除し、Issue と PR に記録する。

# 完了条件

- 凍結 commit が全サーバーで一致している。
- 未コミットの変更がない。
- 凍結 commit が Issue に記録されている。

