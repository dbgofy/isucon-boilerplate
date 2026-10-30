---
title: "サーバーの構成とマシンスペックを確認する"
milestone: "04 競技序盤"
labels:
  - type:infrastructure
  - type:documentation
depends_on:
  - prepare-local-access.md
---

# 目的

サーバー間の役割と性能条件を把握し、以後の分析の基準を作る。

# 前提条件

- 各サーバーへ SSH できる。
- 役割と接続先はユーザー提供情報を正とし、実測と分けて記録する。

# 対象サーバー

Issue に記録した全競技サーバー。

# 作業

- root の PATH にコマンドがなくても未導入と断定しない。提供 toolchain の実体と稼働 binary の build 情報を照合し、compiler / binary の版を分けて記録する。MySQL 等の package revision、サーバー別の稼働サービス差も残す。
- 観測時刻・サーバー・commit を記録し、環境詳細を `knowledges/`、概要とリンクを README に保存する。shell の ulimit と systemd の LimitNOFILE を区別する。

- hostname、OS、CPU、メモリ、ディスク、ネットワークを確認する。
- OS、言語ランタイム、ミドルウェア、アプリケーションの種類とバージョンを確認する。
- 実行中のサービスと listen port を確認する。
- アプリケーション、DB、プロキシなどの配置を確認する。
- `/etc/hosts` など必要な名前解決を確認する。
- 構成図を作成し、ユーザー提供情報と実測情報を分けて記録する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
mkdir -p /tmp/isucon-work/env
```

hostname、OS、資源、ネットワーク、listen、hosts の確認。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'bash -s' <<'EOF' | tee "/tmp/isucon-work/env/${s}.txt"
echo "### hostname"
hostname; hostname -s; hostname -I
echo "### os"
cat /etc/os-release
uname -a
echo "### versions"
nginx -v 2>&1 || true
mysql --version 2>/dev/null || mariadb --version 2>/dev/null || true
redis-server --version 2>/dev/null || true
go version 2>/dev/null || true
node -v 2>/dev/null || true
ruby -v 2>/dev/null || true
php -v 2>/dev/null | head -n 1 || true
java -version 2>&1 | head -n 1 || true
perl -v 2>/dev/null | head -n 2 || true
echo "### cpu"
nproc
lscpu | egrep 'Model name|Socket|Core|Thread|CPU\(s\)|MHz'
echo "### memory"
free -h
echo "### disk"
df -hT
lsblk
echo "### network"
ip -br a
ip route
cat /etc/hosts
echo "### listen"
ss -lntp
echo "### services"
systemctl list-units --type=service --state=running --no-pager
echo "### processes"
ps auxf | head -n 80
EOF
done
```

アプリケーション、DB、プロキシの配置確認。サービス名は実機で確認したものを使う。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'bash -s' <<'EOF' | tee -a "/tmp/isucon-work/env/${s}.txt"
echo "### nginx"
systemctl is-active nginx 2>/dev/null || true
nginx -t 2>/dev/null || true
ls /etc/nginx/sites-enabled 2>/dev/null || true
echo "### mysql"
systemctl is-active mysql mysqld mariadb 2>/dev/null || true
mysql --version 2>/dev/null || mariadb --version 2>/dev/null || true
echo "### app user home"
ls -la /home/isucon
echo "### systemd units related to app"
systemctl list-units --type=service --no-pager | grep -iE 'isu|app|web' || true
EOF
done
```

構成の記録。ユーザー提供の役割と実測を分ける。

```bash
gh issue comment "$ISSUE" --body "$(cat <<EOF
## 実測

各サーバーの出力は \`/tmp/isucon-work/env/\` に保存した。

## バージョン

- OS:
- 言語ランタイム:
- ミドルウェア:
- アプリケーション:

## ユーザー提供の役割

- s1:
- s2:
- s3:

## 不明点 / 推測
EOF
)"
```

# 確認方法

```bash
ls /tmp/isucon-work/env
grep -H 'hostname' /tmp/isucon-work/env/*.txt
grep -A20 '### versions' /tmp/isucon-work/env/*.txt
```

# 失敗時の復旧

- SSH できない: `prepare-local-access.md` の接続情報を確認する。接続先は変えない。
- コマンド欠如: 入っているコマンドだけで記録し、未取得項目を Issue に書く。

# 完了条件

- サーバーごとの役割と接続方法を Issue に記録している。
- OS、言語ランタイム、ミドルウェア、アプリケーションのバージョンを記録している。
- 不明な構成や推測を明記している。

