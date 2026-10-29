---
title: "不要なインスタンスを停止する"
labels:
  - phase:after-competition
  - type:infrastructure
  - type:deployment
depends_on:
  - final-benchmark.md
---

# 目的

競技終了後に不要な検証環境を止め、誤操作と不要な課金を防ぐ。

# 前提条件

- 運営管理の競技サーバーは、許可なく停止しない。
- バックアップと Release が済んでいることを確認してから止める。

# 対象

チームが起動した検証環境、モニタリング用プロセス。運営から貸与された本番競技サーバーは、ユーザーまたは運営の指示がある場合のみ。

# 作業

- 停止してよいインスタンス、検証用サーバー、モニタリング用プロセスを確認する。
- 運営管理の競技サーバーと、チームが起動した検証環境を区別する。
- 停止対象、停止日時、残す理由を記録する。
- 必要なバックアップや Release が済んでいることを確認してから停止する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

## 1. 対象を分類する

```text
- 運営管理の競技サーバー（原則停止しない）:
- チームが起動した検証 VM / クラウドインスタンス:
- 各サーバー上の monitoring プロセス:
```

## 2. monitoring だけ止める場合

運営サーバー上のプロセス停止は、インスタンス停止ではない。

```bash
SERVERS=(s1 s2 s3)
for s in "${SERVERS[@]}"; do
  ssh "$s" 'pkill prometheus; pkill node_exporter; pkill process-exporter; pkill grafana-server; true
    pgrep -a prometheus || echo stopped'
done
```

## 3. チーム所有インスタンスを止める場合

使うクラウドの手順はユーザー提供情報に従う。次は AWS を使っている場合の例で、未使用なら実行しない。

```bash
# aws ec2 describe-instances --query 'Reservations[].Instances[].[InstanceId,Tags[?Key==`Name`].Value|[0],State.Name,PublicIpAddress]' --output table
# aws ec2 stop-instances --instance-ids i-xxxxxxxx
```

ポータルに「インスタンス削除」がある場合は、その案内を正とする。

## 4. 停止結果を記録する

```bash
gh issue comment "$ISSUE" --body "$(cat <<'EOF'
- 停止対象:
- 停止日時:
- 残置対象と理由:
- 運営環境を止めていないこと:
EOF
)"
```

# 確認方法

- 残置対象が一覧できる。
- 運営環境の状態を、許可なく変更していない。

# 失敗時の復旧

- 誤って止めた: 運営手順またはクラウドの start を、ユーザー確認のうえ実行する。データ消失がある場合はバックアップ Release を使う。

```bash
# aws ec2 start-instances --instance-ids i-xxxxxxxx
```

# 完了条件

- 停止対象と残置対象が記録されている。
- 運営管理の環境を、許可なく停止していない。

