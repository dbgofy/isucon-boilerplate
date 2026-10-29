# isucon-boilerplate

## 使い方

### 初期設定

#### ローカルPCでの作業

**新しいリポジトリを作成する**

- [ ] https://github.com/dbgofy/isucon-boilerplate/generate から新しいリポジトリを作成します。

**メンバーを追加する**

- [ ] https://github.com/$GITHUB_REPOSITORY/settings/access からチームメンバーを招待します。
  - 組織でデフォルト権限を設定している公開メンバーは招待不要です。
  - [Update SSH Keys](https://github.com/$GITHUB_REPOSITORY/actions/workflows/update-sshkeys.yml) を実行します。

#### 各競技サーバーでの作業

以下のコマンドを `root` ユーザーで実行します。

**SSHデプロイキーを生成・登録する**

```bash
ssh-keygen -t rsa
cat ~/.ssh/id_rsa.pub
```

出力結果をコピーし、[デプロイキー](https://github.com/$GITHUB_REPOSITORY/settings/keys/new)として登録します。

**インストールする**

```bash
cd /
git init
git remote add origin git@github.com:$GITHUB_REPOSITORY.git
git fetch origin master
git reset --hard FETCH_HEAD
make
```

デプロイキーを追加し、`git push -u origin master` を実行します。

### 監視サーバーを起動する

```bash
make monitoring
```

ブラウザーからポート3999にアクセスします。

### 設定ファイルを編集する

```bash
vim /etc/nginx/nginx.conf
```

### ソースファイルをGitの管理対象に追加する

```bash
cd /home/isucon
git add -f *.go
```
