# 共通タスク候補

このディレクトリには、本番と練習のどちらでも使える一回限りのタスク候補を置く。
各 Markdown ファイルは GitHub Issue のタイトル、label、本文の雛形として利用する。

各タスクには、目的に加えて前提条件、対象、作業、確認方法、失敗時の復旧、完了条件を書く。

ユーザーの入力・判断・操作が必要なタスクには front matter に `needs-user-action: true` を付け、同名の label を付ける。必要な情報は各タスクの本文を参照する。

計測データや図の一時ファイルは `/tmp/isucon-work/` などの一時領域に置き、リポジトリ直下に専用の成果物ディレクトリは作成しない。正式な要約・数値・判断理由は Issue、Pull Request、Release に記録する。

「作業」には実施項目を箇条書きする。コマンドは「実行例」として段落を分ける。
実行例の説明を書く場合も、その「実行例」の中に書く。
コマンドは問題や環境によって構成、パス、サービス名、言語、接続方法が異なるため、Issue に記録したユーザー提供情報と実機の状態に合わせて読み替える。推測で埋めない。

## Issue 化

1. 対象ファイルの front matter から `title` と `labels` を確認する。
2. front matter の終了区切り `---` より後の内容を Issue 本文として使用する。
3. 実施対象の競技、サーバー情報、関連タスクを追記する。
4. `phase:*` と `type:*` の label を付けて Issue を作成する。`needs-user-action: true` の場合は `needs-user-action` label も付ける。

各タスクの `depends_on` には、先に完了させるタスクのファイル名を記載する。
依存関係がないタスクは `depends_on: []` とする。
Issue 化時には `depends_on` を依存先IssueへのGitHub Issue dependency（blocked by）として登録する。

リポジトリ作成時に `on-created` workflow が有効な場合は、`tasks/*.md`（`README.md` を除く）から
自動的に Issue が作成される。自動作成後に、対象競技やサーバー情報など問題ごとの内容を追記する。
作成された「ISUCON 共通タスク」Issue の sub-issue として登録される。
`depends_on` はsub-issueの親子関係ではなく、複数の依存先を表現できるIssue dependency（blocked by）として登録する。共通タスクのsub-issueの親を依存先へ変更してはならない。

phase label は作業を行う時期を表す。

- `phase:day-before` — 前日準備
- `phase:just-before` — 競技直前
- `phase:start` — 競技開始直後
- `phase:early-competition` — 競技序盤
- `phase:mid-competition` — 競技中盤
- `phase:final-check` — 競技終盤
- `phase:after-competition` — 競技終了後

タスク候補は問題固有のエンドポイント名、テーブル名、解答手順を含めない。
問題固有の改善は、計測結果に基づいて競技中に個別の Issue として作成する。


## フェーズ別タスク一覧

必要な時期のタスクだけ本文を参照する。

### day-before

- [競技中の連絡手段と通知を準備する](prepare-communication.md)
- [GitHub Project を準備する](prepare-project.md)
- [競技用リポジトリを準備する](prepare-repo.md)
- [レギュレーションを確認する](read-regulation.md)

### just-before


### start

- [運営提供のインフラを適用する](apply-provided-infra.md)
- [DB の初期データなど Git 管理対象外のデータをバックアップする](backup-initial-state.md)
- [ポータルを確認する](check-portal.md)
- [競技サーバーを初期化し Git 管理へ登録する](initialize-servers.md)
- [ローカルの接続設定を用意する](prepare-local-access.md)
- [マニュアルを確認する](read-manual.md)
- [ベンチマーク仕様をまとめる](summarize-benchmark-spec.md)

### early-competition

- [アプリケーション構成を確認分析する](analyze-application-architecture.md)
- [サーバーの構成とマシンスペックを確認する](check-environment.md)
- [アクセスログの集計を設定する](prepare-access-log.md)
- [デプロイ手順を用意する](prepare-deploy.md)
- [ログローテーションを用意する](prepare-logrotate.md)
- [計測とモニタリングを準備する](prepare-observability.md)
- [OS の制限と不要なフィルタを確認する](relax-os-limits.md)
- [初期スキーマとインデックスを確認する](review-initial-schema.md)
- [初期状態のベースラインを計測する](run-baseline-benchmark.md)
- [言語ランタイムを更新する](update-runtime.md)

### mid-competition

- [再起動試験（1回目）](reboot-1.md)

### final-check

- [提出用ベンチマーク前に計測機能を無効化する](disable-instrumentation.md)
- [提出用の最終ベンチマークを実行する](final-benchmark.md)
- [変更を凍結する](freeze.md)
- [再起動試験（2回目）](reboot-2.md)
- [再起動試験（3回目）](reboot-3.md)
- [再起動試験（最終）](reboot-final.md)

### after-competition

- [リポジトリを公開する](publish-repo.md)
- [競技結果を GitHub Release に記録する](record-contest-result.md)
- [通知用 token を revoke する](revoke-tokens.md)
- [不要なインスタンスを停止する](stop-instances.md)
- [振り返りを公開する](write-retrospective.md)

## リポジトリ作成時の Issue 化と後片付け

front matter は `title`（文字列）、`labels` と `depends_on`（ブロックリストまたは `[]`）、
任意の `needs-user-action`（`true` / `false`）を使用します。任意の YAML 構文には対応しません。
不明な依存先・循環依存・不正なメタデータは、Issue を作成する前にエラーになります。

```sh
node .github/scripts/create-task-issues.cjs
```

On Created は master への push と手動実行で動作し、テンプレートリポジトリでは実行しません。
同じリポジトリの実行は直列化します。Issue 本文の `<!-- task-template: ファイル名 -->` を識別子に
するため、途中失敗後に再実行する際もこのコメントを保持します。
同じ識別子の Issue や親 Issue が複数あれば、重複作成せず停止します。
再実行では既存の本文・完了状態・label を更新しません。
既存タスクが別の親に属する場合は親を強制変更せず、エラーを確認してから整理してください。

Issue 化は作業実行の許可を意味しません。実機操作や外部サービスの変更は対象・権限を確認して行います。

リポジトリ作成後にタスクファイルを追加する運用は行いません。
全タスクの Issue 作成・親への登録・依存関係の登録が成功してから、対応するタスクファイル（`tasks/README.md` を除く）、
Issue 作成スクリプト、On Created workflow を削除し、README 初期化とともに
commit・通常 push します。競技中は作成済み Issue で作業を管理します。
処理が途中で失敗した場合は削除・push を行わず、workflow とテンプレートを残して再実行できます。
Git push に失敗しても、リモートには初期化用ファイルが残るため、再実行で後片付けを完了できます。

`tasks/README.md` は運用説明としてリポジトリに残します。フェーズ別タスク一覧のリンクは、初期化時に作成済み Issue の URL へ置き換えます。
