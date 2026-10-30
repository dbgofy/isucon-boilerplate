---
title: "アクセスログの集計を設定する"
labels:
  - phase:early-competition
  - type:observability
  - type:task
depends_on:
  - initialize-servers.md
  - prepare-observability.md
---

# 目的

リクエスト単位の所要時間と件数を集計し、改善対象の選定に使えるようにする。

# 前提条件

- アクセスログのパスと形式は実機で確認する。
- パス正規化ルールは、アプリケーションのルート定義を読んでから作る。初回ログはパラメータの実形と、アプリ外パスの確認に使う。
- 問題固有のパスを未確認のまま書かない。

# 対象サーバー

プロキシまたはアプリのアクセスログがあるサーバー。

# 作業

- プロキシまたはアプリケーションのアクセスログ形式を確認する。
- 集計ツールを入れ、ルート定義と初回ログからパスの正規化ルールを決める。
- 集計結果の保存先と共有方法を決める。
- 提出用計測前に無効化または影響を除けることを確認する。

## 実行例

コマンドは実行例である。問題や環境によって構成、パス、サービス名、接続方法は異なる。Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。

```bash
SERVERS=(s1 s2 s3)
mkdir -p /tmp/isucon-work/alp
```

## 1. ログ形式を確認する

```bash
for s in "${SERVERS[@]}"; do
  ssh "$s" 'hostname
    grep -RInE "access_log|log_format" /etc/nginx 2>/dev/null | head
    sudo tail -n 3 /var/log/nginx/access.log 2>/dev/null || true'
done
```

LTSV が必要なら、原本を Git に入れてからローカルで `log_format` を変更し、`git pull` と nginx 再読込で反映する。

```bash
# サーバー上では直接編集しない
ssh s1 'nginx -t && systemctl reload nginx'
```

## 2. 集計ツールを入れる

レギュレーションで禁止されていないことを確認してから入れる。

```bash
ssh s1 'command -v alp || (curl -sL https://github.com/tkuchiki/alp/releases/latest/download/alp_linux_amd64.zip -o /tmp/alp.zip && unzip -o /tmp/alp.zip -d /usr/local/bin && chmod +x /usr/local/bin/alp)
alp --version'
```

## 3. ルート定義と初回ログから正規化ルールを決める

生 URI の出現件数だけで `:id` を推測しない。ルート定義で可変セグメントを確定し、ログと nginx 設定で足りないパスを足す。未確認のパスを書かない。

### 3.1 ルート定義を抜く

実装ディレクトリとフレームワークは実機で確認する。ソースが手元の Git にあればローカルで読んでよい。

```bash
ssh s1 'bash -s' <<'EOF'
hostname
ls -la /home/isucon
find /home/isucon -maxdepth 4 -type d ! -path '*/vendor/*' ! -path '*/node_modules/*' ! -path '*/.git/*' | sort
grep -RInE '\.(GET|POST|PUT|PATCH|DELETE)\(|HandleFunc\(|router\.(get|post|put|patch|delete)\(|Route::|@(Get|Post|Put|Patch|Delete)Mapping' \
  /home/isucon --include='*.go' --include='*.php' --include='*.rb' --include='*.py' --include='*.js' --include='*.ts' \
  2>/dev/null | grep -vE '/(vendor|node_modules)/' | head -n 80
EOF
```

静的ファイルなどアプリが扱わないパスは nginx の `location` から足す。

```bash
ssh s1 'grep -RInE "location |root |alias " /etc/nginx 2>/dev/null | head -n 40'
```

パラメータの型はハンドラを読んで決める。数値なら `[0-9]+`、UUID ならコード上の形式、不明なら `[^/]+` にしてログで絞る。より具体的なパターンを先に書く。

```text
# 確認したルートだけ書く例。このまま使わない。
# GET /users/:id          -> /users/[0-9]+
# GET /items/:uuid/detail -> /items/[0-9a-f-]+/detail
```

### 3.2 初回ログと突き合わせる

```bash
ssh s1 'sudo awk "{print \$7}" /var/log/nginx/access.log 2>/dev/null | sort | uniq -c | sort -nr | head -n 50'
```

ルートに無い URI（静的ファイル、ヘルスチェック、未使用パス）がログにあれば、根拠を残して `-m` に足す。クエリ文字列の有無は確認した `log_format` に合わせる。

LTSV の場合の集計例。`--file` は確認したパスにする。`MATCHING` は 3.1 で確定したパターンだけ入れる。

```bash
# 未確認のパスを書かない
MATCHING='REPLACE_AFTER_READING_ROUTES'
ssh s1 "sudo alp ltsv --file /var/log/nginx/access.log -m '$MATCHING' --sort sum -r -o count,method,uri,min,avg,max,sum,p99 | head -n 40" \
  | tee /tmp/isucon-work/alp/first.txt
```

## 4. 提出前に影響を除けることを確認する

```text
- 集計はベンチ後のオフライン処理か:
- ログ形式変更がスコアに影響するか:
- 無効化手順:
```

# 確認方法

```bash
test -s /tmp/isucon-work/alp/first.txt
head /tmp/isucon-work/alp/first.txt
```

# 失敗時の復旧

- 形式不一致: `alp json` / `alp regexp` など、確認した形式に切り替える。
- ログが空: `prepare-logrotate.md` の直後ではないか、nginx の `access_log` 先を再確認する。
- ルートが見つからない: 実装ディレクトリとフレームワークの書き方を実機で確認する。推測でパスを足さない。
- 正規化が粗い / 複数エンドポイントが潰れる: ハンドラのパラメータ型と生 URI を再確認し、具体的なパターンを先に置く。

# 完了条件

- 同じ手順でアクセスログを集計できる。
- 集計設定と、ルート定義とログを根拠にしたパス正規化が記録されている。

