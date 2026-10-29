---
title: "デプロイ手順を用意する"
labels:
  - phase:early-competition
  - type:deployment
  - type:task
depends_on:
  - initialize-servers.md
---

# 目的

アプリケーションと設定の反映を、毎回同じ手順で再現できるようにする。

# 前提条件

- 各サーバーへ root で SSH でき、`/` が Git 管理されている。
- 変更はローカルで行い、サーバー上では直接編集しない。
- サーバー差分は `hostname` で扱う。

# 対象サーバー

Issue に記録した全競技サーバー。

# 作業

- `git pull`、ビルド、再起動、ログ確認の手順を決める。
- サーバーごとの差分は `hostname` で扱う。
- 手順は Makefile など、リポジトリ上のコマンドにまとめる。
- 反映前後の commit と対象サーバーを記録できる形にする。
- 一度実行して、サービスが起動することを確認する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
BRANCH=master
```

## 1. 起動中のサービス名を確定する

`check-environment.md` の記録を正とする。未確認なら実機で確認する。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'hostname; systemctl list-units --type=service --state=running --no-pager | grep -iE "nginx|mysql|mariadb|isu|app|web"'
done
```

## 2. リポジトリにデプロイ用ターゲットを追加する

ローカルで Makefile 等に、毎回同じ順で実行するコマンドを書く。サービス名は前段で確認した値だけ使う。

```makefile
.PHONY: deploy
deploy:
	git pull origin master
	# ビルドと再起動は、マニュアルまたは実機で確認したコマンドに置き換える
	# 例: sudo -u isucon bash -lc 'cd /home/isucon/webapp && make'
	# 例: systemctl restart nginx
```

アプリ側に既存の restart スクリプトがある場合はそれを呼び、新規に別手順を増やさない。

```bash
find /home/isucon -maxdepth 3 -type f \( -name 'Makefile' -o -name '*restart*' -o -name 'deploy.sh' \) | sort
```

## 3. 一度実行して起動を確認する

ローカルで commit したあと、各サーバーで pull してデプロイする。

```bash
# ローカル
git status
git log -1 --oneline

# 各サーバー
for s in "${SERVERS[@]}"; do
  ssh "$s" "cd / && git pull origin ${BRANCH} && make deploy"
done
```

`make deploy` がまだ無い間の手動手順。

```bash
ssh s1 'bash -s' <<'EOF'
set -eu
cd /
git pull origin master
git log -1 --oneline
# 以下は実機で確認したサービス名に置き換える
# sudo -u isucon bash -lc 'cd /home/isucon/webapp && make'
# systemctl restart nginx
systemctl is-active nginx || true
ss -lntp
EOF
```

## 4. 反映内容を記録する

```text
- デプロイ日時:
- 対象サーバー:
- commit:
- 実行したコマンド:
- 起動確認:
```

# 確認方法

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'hostname; git -C / rev-parse --short HEAD; git -C / status -sb; systemctl is-active nginx'
done
```

# 失敗時の復旧

- `git pull` が衝突する: サーバー上を編集せず、ローカルの状態を正にして取り込み直す。
- サービスが落ちる: `journalctl -u <unit> -n 100 --no-pager` を保存し、直前 commit へ戻す。

```bash
ssh s1 'cd / && git log -5 --oneline && git checkout "$PREV_COMMIT" -- path && systemctl restart SERVICE'
```

# 完了条件

- 競技サーバー上で設定やコードを直接編集しなくても反映できる。
- 手順と確認方法がリポジトリまたは Issue に残っている。

