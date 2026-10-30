---
title: "言語ランタイムを更新する"
milestone: "04 競技序盤"
labels:
  - type:infrastructure
  - type:application
depends_on:
  - initialize-servers.md
  - prepare-deploy.md
---

# 目的

利用する言語の実行環境を確認し、許可された範囲で更新できる状態にする。

# 前提条件

- レギュレーション上の制約を確認してから更新する。
- 使っていない言語を入れない。更新手順はローカルで作り `git pull` する。

# 対象サーバー

アプリケーションを動かすサーバー。

# 作業

- root の PATH にコマンドがなくても未導入と断定しない。提供 toolchain の実体と稼働 binary の build 情報を照合し、compiler / binary の版を分けて記録する。MySQL 等の package revision、サーバー別の稼働サービス差も残す。
- 観測時刻・サーバー・commit を記録し、環境詳細を `knowledges/`、概要とリンクを README に保存する。shell の ulimit と systemd の LimitNOFILE を区別する。

- 現在の言語、コンパイラ、ランタイムの版を確認する。
- レギュレーション上の制約を確認する。
- 必要なら更新手順をローカルで作成し、`git pull` で競技サーバーへ同期する。
- 更新後にアプリケーションが起動することを確認する。
- 版と変更理由を記録する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
```

## 1. 現在の版を確認する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'bash -s' <<'EOF'
hostname
command -v go && go version
command -v node && node -v
command -v ruby && ruby -v
command -v php && php -v | head -n 1
command -v perl && perl -v | head -n 2
command -v rustc && rustc --version
ls /home/isucon/local /home/isucon/.x /usr/local 2>/dev/null | head
EOF
done
```

マニュアルや `/home/isucon` の言語ディレクトリから、実際に使う実装を確定する。
特に指示がなければ Go のみを対象とする。

## 2. 制約を Issue に書く

```text
- 利用言語:
- 現在の版:
- レギュレーション上の上限 / 禁止:
- 更新するか（しない場合はその理由）:
```

## 3. 更新する場合は手順をリポジトリに置く

公式のインストール方法を使い、サーバー上でアドホックに版を変えない。更新後にアプリが起動することを確認する。

```bash
# ローカルで手順を追加して push したあと
ssh s1 'cd / && git pull origin master'
# リポジトリに書いた更新コマンドを実行
ssh s1 'command -v go && go version'
# アプリ起動は prepare-deploy の手順を使う
```

# 確認方法

```bash
ssh s1 'go version; systemctl is-active nginx'
```

再起動後も同じ版か。

```bash
ssh s1 'reboot'
# 起動後
ssh s1 'go version'
```

# 失敗時の復旧

- アプリが起動しない: 直前の版へ戻し、`prepare-deploy` の再起動手順を使う。
- レギュレーション違反の疑い: 更新を止め、公式案内を再確認する。

# 完了条件

- 利用する言語の版が Issue に記録されている。
- 更新した場合、再起動後も同じ版で起動する。

