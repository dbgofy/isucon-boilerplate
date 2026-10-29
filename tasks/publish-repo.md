---
title: "リポジトリを公開する"
labels:
  - phase:after-competition
  - type:task
  - type:documentation
depends_on:
  - record-contest-result.md
---

# 目的

競技終了後、公開してよい範囲でリポジトリを公開し、後から変更履歴を参照できるようにする。

# 前提条件

- レギュレーション上の公開可否を確認している。
- 公開前に秘密情報の履歴を確認する。

# 対象サーバー

なし。GitHub リポジトリ。

# 作業

- レギュレーション上の公開可否を確認する。
- 秘密鍵、token、接続情報、個人情報が履歴に残っていないか確認する。
- 残っている場合は公開前に取り除く。
- 公開範囲を変更し、結果を記録する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
REPO=OWNER/REPOSITORY
```

## 1. 公開可否を確認する

レギュレーションと運営案内を読み、可否を Issue に書く。禁止期間中は実行しない。

## 2. 秘密情報の履歴を確認する

```bash
git fetch origin --tags
git log --all -p -G 'BEGIN (OPENSSH|RSA) PRIVATE KEY|WEBHOOK_URL=|xoxb-|ghp_' -- | head
git log --all --full-history -- '*id_rsa' '*id_ed25519' '*.pem' '*.env' '*notify.env'
git ls-files | grep -iE 'id_rsa$|id_ed25519$|\.pem$|\.env$|notify\.env' || true
```

`files/pubkey/` の公開鍵と、workflow が作る `authorized_keys` に秘密鍵が含まれていないこと。含まれていれば公開しない。

## 3. 残っている場合は公開前に除く

履歴改変が必要なら、公開前にチームで手順を決める。`git push --force` はユーザーが明示したときだけ行う。

```bash
# 追跡から外す（履歴に残る場合はこれだけでは不足）
# git rm --cached path
```

## 4. 公開範囲を変更する

```bash
gh repo view "$REPO" --json visibility,isPrivate
# レギュレーションが許可し、秘密情報が無いときだけ
# gh repo edit "$REPO" --visibility public --accept-visibility-change-consequences
gh repo view "$REPO" --json visibility,url
```

# 確認方法

```bash
gh repo view "$REPO" --json visibility,isPrivate,url
```

# 失敗時の復旧

- 秘密情報が見つかった: 公開を中止し、token を revoke する。履歴からの除去は別途合意する。
- 誤って public にした: 直ちに private へ戻す。

```bash
gh repo edit "$REPO" --visibility private --accept-visibility-change-consequences
```

# 完了条件

- 公開可否の判断と実施結果が Issue に残っている。
- 秘密情報を公開していない。
