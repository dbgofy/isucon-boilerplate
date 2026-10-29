---
title: "競技サーバーを初期化し Git 管理へ登録する"
needs-user-action: true
labels:
  - phase:start
  - type:infrastructure
  - type:deployment
depends_on:
  - prepare-repo.md
  - prepare-local-access.md
---

# 目的

設定ファイルとアプリケーションコードの変更前の状態を Git で保持し、以後の変更を追跡可能にする。

# 前提条件

- `prepare-repo.md`、`prepare-local-access.md` が完了している。
- レギュレーション確認 (`read-regulation.md`) とマニュアル確認 (`read-manual.md`) は依存ではない。並行して進めてよい。
- 接続先、SSH ユーザー、鍵は Issue に記録したユーザー提供情報を使う。推測で決めない。
- `git reset --hard` は初期セットアップ時だけ使う。既に `/.git` があるサーバーでは実行しない。

# 対象サーバー

Issue に記録した全競技サーバー。各サーバーで同じ手順を繰り返す。

# 作業

- 初回セットアップ時だけ `isucon` ユーザーで SSH 接続する。
- `/` に Git リポジトリを作成し、origin と default branch を設定する。
- 必要なファイルだけを whitelist 形式で追加する。
- `/home/isucon` のアプリケーションソースを明示的に追加する。
- 設定ファイルは変更前の原本を追加して commit する。
- 初期状態をバックアップする。
- 初期セットアップ完了後、root での SSH 接続を確認する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
REPO_SSH=git@github.com:OWNER/REPOSITORY.git
BRANCH=master
# SSH Host 名は prepare-local-access で設定したもの
SERVERS=(s1 s2 s3)
```

## 1. 未初期化であることを確認する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'hostname; whoami; test ! -d /.git && echo "UNINITIALIZED" || echo "ALREADY_INITIALIZED"'
done
```

`ALREADY_INITIALIZED` のサーバーでは `git reset --hard` を使わない。`git status` を確認してから続行可否を Issue に書く。

## 2. isucon ユーザーで入り、root になる

初回セットアップ時だけ `isucon` で接続する。

```bash
ssh s1
sudo -i
```

## 3. GitHub 用の deploy key を作成し登録する

```bash
install -d -m 700 /root/.ssh
test -f /root/.ssh/id_rsa || ssh-keygen -t rsa -b 4096 -N '' -f /root/.ssh/id_rsa
ssh-keyscan -t rsa,ecdsa,ed25519 github.com >> /root/.ssh/known_hosts
cat /root/.ssh/id_rsa.pub
```

表示された公開鍵を [Deploy key](https://github.com/OWNER/REPOSITORY/settings/keys/new) に登録する。サーバーから `git push` するため、Allow write access を有効にする。秘密鍵はリポジトリに保存しない。

## 4. `/` を Git 作業ツリーにしてリポジトリを取り込む

```bash
cd /
git init
git remote add origin "$REPO_SSH"
git fetch origin "$BRANCH"
git reset --hard FETCH_HEAD
git branch -M "$BRANCH"
git status
```

## 5. make が変更する設定の原本を、変更前に Git へ入れる

`make` は `/etc/sudoers` と `/etc/ssh/sshd_config` を変更する。変更前に原本を whitelist して commit する。パスは実機で確認してから追加する。存在しないファイルは対象にしない。

```bash
cd /
ls -l /etc/sudoers /etc/ssh/sshd_config /etc/nginx /etc/mysql /etc/systemd/system
for f in \
  /etc/sudoers \
  /etc/ssh/sshd_config \
  /etc/nginx/nginx.conf \
  /etc/mysql/my.cnf
do
  [ -e "$f" ] || continue
  /files/gitignore.sh "$f"
done
```

サイト設定や drop-in がある場合は、確認したパスだけ追加する。

```bash
find /etc/nginx /etc/mysql /etc/systemd/system -type f \( -name '*.conf' -o -name '*.cnf' -o -name '*.service' \) | sort
# 確認したファイルだけ
/files/gitignore.sh /etc/nginx/sites-enabled/example
```

## 6. 初期セットアップを実行する

```bash
cd /
make
```

`make` は deploy key の登録 URL と公開鍵を表示する。未登録なら登録してから次へ進む。

## 7. アプリケーションソースを明示して追加する

バイナリ、`vendor`、`node_modules`、ログ、DB データは追加しない。対象は実機で確認したソースだけにする。

```bash
ls -la /home/isucon
find /home/isucon -maxdepth 3 -type d | sort
# 例: Go 実装を追跡する場合。実際のパスと拡張子は確認してから使う。
cd /home/isucon
git add -f webapp/go/*.go webapp/go/go.mod webapp/go/go.sum
git status
git commit -m "Track application source on $(hostname)"
```

## 8. 秘密情報や実行時データが入っていないことを確認して push する

```bash
cd /
git ls-files | grep -E 'id_rsa$|id_ed25519$|\.pem$|\.env$|authorized_keys|\.sqlite|\.db$|/vendor/|/node_modules/|\.sock$' || true
git log --oneline -5
git push -u origin "$BRANCH"
```

一致したパスは `git rm --cached` してから再 push する。

## 9. 手元の公開鍵で root 接続できる状態にする

GitHub Actions の Update SSH Keys が collaborator の公開鍵を `root/.ssh/authorized_keys` に書く。workflow 完了後にサーバーで取り込む。

```bash
# ローカル
gh workflow run update-sshkeys.yml --repo OWNER/REPOSITORY
gh run watch --repo OWNER/REPOSITORY

# 各サーバー（isucon のまま）
cd /
git pull origin master
```

workflow を待たない場合は、手元の公開鍵を root に追加する。

```bash
# ローカル。公開鍵パスはユーザー提供の鍵に合わせる。
pubkey="$HOME/.ssh/id_ed25519.pub"
for s in "${SERVERS[@]}"; do
  ssh "$s" "sudo tee -a /root/.ssh/authorized_keys" < "$pubkey"
  ssh "$s" 'sudo chmod 600 /root/.ssh/authorized_keys'
done
```

## 10. root での SSH を確認する

```bash
for s in "${SERVERS[@]}"; do
  ssh -o User=root "$s" 'whoami; hostname; git -C / rev-parse --abbrev-ref HEAD; git -C / status -sb'
done
```

確認できたら、ローカル SSH 設定の `User` を `root` に変更する。以後の同期はローカルで変更し、サーバーでは `git pull` する。

DB の初期データなど Git に入れないデータのバックアップは `tasks/backup-initial-state.md` で行う。

# 確認方法

```bash
for s in "${SERVERS[@]}"; do
  ssh -o User=root "$s" 'set -e
    test -d /.git
    git -C / remote -v
    git -C / log -1 --oneline
    git ls-files | wc -l
    echo PermitRootLogin: $(sudo sshd -T | awk "/^permitrootlogin /{print \$2}")
  '
done
```

# 失敗時の復旧

- `git fetch` が失敗する: deploy key の登録と write 権限、`/root/.ssh/id_rsa` の有無を確認する。
- `make` の途中で失敗する: `cd / && make` を再実行する。`make clean` は sshd と sudoers を戻し、鍵も消すため、理由を確認してから使う。
- root で入れない: `isucon` ユーザーで入り、`/root/.ssh/authorized_keys` と `sshd -t` を確認する。
- 既に `/.git` があるのに `git reset --hard` した場合: `git reflog` と `git status` を確認し、以後は reset しない。

# 完了条件

- 各サーバーで変更前の状態を確認できる。
- Git 管理対象に秘密鍵、DB データ、バイナリ、実行時生成データが含まれていない。
- 以後の同期をローカル変更と `git pull` で行える。
- 各サーバーへ root で SSH できる。

