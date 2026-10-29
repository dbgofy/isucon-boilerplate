---
title: "OS の制限と不要なフィルタを確認する"
labels:
  - phase:early-competition
  - type:infrastructure
  - type:security
depends_on:
  - initialize-servers.md
  - check-environment.md
---

# 目的

アプリケーションやベンチマークを阻害しうる OS 制限、強制アクセス制御、パケットフィルタを把握し、必要なものだけ残す。

# 前提条件

- 変更する場合は原本を Git に残し、ローカルで編集して `git pull` する。
- SSH を切れない変更は、コンソール到達手段があるときだけ行う。

# 対象サーバー

Issue に記録した全競技サーバー。

# 作業

- AppArmor や SELinux など、強制アクセス制御の状態を確認する。
- iptables、nftables、firewalld など、フィルタの有無を確認する。
- `ulimit`、ファイルディスクリプタ、sysctl の制限を確認する。
- 変更する場合は原本を Git に残してからローカルで変更し、`git pull` で同期する。
- 変更理由と、残した制限を記録する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
mkdir -p /tmp/isucon-work/os-limits
```

## 1. 強制アクセス制御を確認する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'bash -s' <<'EOF' | tee "/tmp/isucon-work/os-limits/${s}.txt"
hostname
echo "### apparmor"
aa-status 2>/dev/null || apparmor_status 2>/dev/null || echo 'apparmor not found'
echo "### selinux"
getenforce 2>/dev/null || echo 'selinux not found'
EOF
done
```

## 2. パケットフィルタを確認する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'bash -s' <<'EOF' | tee -a "/tmp/isucon-work/os-limits/${s}.txt"
echo "### iptables"
iptables -S 2>/dev/null || true
echo "### nft"
nft list ruleset 2>/dev/null || true
echo "### firewalld / ufw"
systemctl is-active firewalld 2>/dev/null || true
ufw status verbose 2>/dev/null || true
EOF
done
```

## 3. ulimit と sysctl を確認する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'bash -s' <<'EOF' | tee -a "/tmp/isucon-work/os-limits/${s}.txt"
echo "### ulimit"
ulimit -a
echo "### limits.d"
ls /etc/security/limits.conf /etc/security/limits.d 2>/dev/null || true
echo "### sysctl"
sysctl fs.file-max net.core.somaxconn net.ipv4.tcp_tw_reuse net.ipv4.ip_local_port_range
echo "### systemd LimitNOFILE (nginx 例)"
systemctl show nginx -p LimitNOFILE 2>/dev/null || true
EOF
done
```

## 4. 変更が必要なら原本を残してから行う

確認結果を見て、外す制限だけを決める。残す制限とその理由も Issue に書く。

```bash
# 例: 原本を Git へ
ssh s1 '/files/gitignore.sh /etc/security/limits.conf'
# 変更はローカルで行い、サーバーでは git pull する
```

変更後に SSH と必要な listen が残っていることを確認する。

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'whoami; ss -lntp | head'
done
```

# 確認方法

```bash
ls /tmp/isucon-work/os-limits
grep -H 'somaxconn\|LimitNOFILE\|DROP\|REJECT' /tmp/isucon-work/os-limits/* || true
```

# 失敗時の復旧

- SSH 不能: ポータルのコンソールで戻す。変更した sysctl / iptables を元の Git 内容へ戻す。

```bash
ssh s1 'cd / && git checkout -- /etc/ssh/sshd_config /etc/security/limits.conf; sysctl --system; systemctl reload sshd'
```

# 完了条件

- 確認した制限と変更内容が Issue に記録されている。
- 不要な制限を外した場合でも、SSH と必要なサービスへ到達できる。

