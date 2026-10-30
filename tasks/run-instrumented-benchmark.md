---
title: "計測ありの2回目ベンチマークを実行する"
needs-user-action: true
milestone: "04 競技序盤"
labels:
  - type:performance
  - type:experiment
depends_on:
  - run-baseline-benchmark.md
  - prepare-observability.md
  - prepare-access-log.md
  - prepare-logrotate.md
---

# 目的

初回とは別条件で profile・ログ・OS/DB 指標を採取し、改善対象を実測で選ぶ。

# 必要な情報

必要な情報: 対象構成・採取対象、ポータル、負荷実行の範囲と時間帯。既に許可された範囲は再質問しない。

# 前提条件

- 初回結果と、計測設定・停止方法・collector の最小 smoke を確認済み。
- 原本保存と rollback、必要な profile・ログ・OS/DB 指標の採取は省略しない。
- 対象1台の最小採取準備から実走を先行する。Grafana 初期化、構成図・帳票、全台の包括的 boot 検証はこの実走の必須条件にしない。

# 対象

Issue に記録した構成。計測対象と負荷対象、採取時間と実負荷窓を分ける。

# 作業

- 各対象の exact commit、binary hash、計測設定、負荷条件、初回との条件差を実行前に記録する。
- ポータル到達と既存ジョブを確認してから採取・ベンチを開始し、実 Job ID と開始・終了を保存する。
- profile、アクセス・エラーログ、DB slow log、OS/DB 指標を取得する。欠測のコマンド・exit・stderr・理由を残す。
- native perf は record/report の期限、専用 process group の停止、限定 PID cleanup を設ける。非空でも未完成なら report 成功と扱わない。他の採取完了を native 後処理待ちから分け、archive 前には全 writer 終了を確認する。
- 実環境の perf version/help と短い smoke で build-id / symbol 解決を確認する。`--buildid-mmap`、`--no-inline` 等は対応版・kernel を確認してから採否を決める。実 binary / library と同定情報を保持し、inline 粒度や過去の欠測との比較限界を記録する。
- pprof の flat / cumulative の実 CPU 時間と総 sample に対する比率、上位20件程度を保存する。cumulative は重複するため合計しない。
- MySQL は実物 mysqldumpslow の `-s t` / `-s at` / `-s c` 各上位20件と全出力を保存する。少群数で `-t 20` が失敗する版では exit/stderr を保持し、`-t` を外した全群出力へ fallback する。
- 標準解析の Lock_time 差引、Rows_sent、抽象化、丸めと、独自の Query_time / Rows_examined 集計を区別する。閾値・実採取窓も記録し、SQL 経過時間を process CPU と同一視しない。
- 同じ SQL 群の件数・時間・lock・rows、負荷窓の CPU、score・処理量を時系列で比較する。最大・上位の未解消処理を保留する場合は理由、代替策の根拠、次の具体策と再評価条件を記録する。
- スコア・エラー・timeout、事実 / 仮説 / 判断と欠測理由を Issue とチャットに出す。CPU が実測上の bottleneck なら、序盤は1台の CPU 負荷低減を優先し、水平分散を先行させない。
- 成功・失敗を問わず、実行時 exact commit を target に一意な `bench-<id>` Release を作り、raw・集計・profile・結果を asset として保存して相互リンクする。

## 実行例

```bash
mkdir -p /tmp/isucon-work/instrumented-benchmark
# 実機で確認したログパスと採取窓を使う。
# mysqldumpslow -s t  -t 20 "$SLOW_LOG" > "$OUT/slow-t.txt" 2> "$OUT/slow-t.stderr"
# mysqldumpslow -s at -t 20 "$SLOW_LOG" > "$OUT/slow-at.txt" 2> "$OUT/slow-at.stderr"
# mysqldumpslow -s c  -t 20 "$SLOW_LOG" > "$OUT/slow-c.txt" 2> "$OUT/slow-c.stderr"
```

コマンド・採取物名・期限・停止・fallback は、実環境向けに `ops/` に保存した手順で再現する。

# 確認方法

- 実行時 commit・実 Job ID・実負荷窓・採取窓・条件差を raw と照合する。
- 期限後の残存 process がなく、取得成功と欠測を分け、archive 内の全ファイルが確定している。
- Release の asset と元ファイルのサイズ・digest を照合する。再起動前に一時領域から退避する。

# 失敗時の復旧

- native 採取失敗: 期限と限定 cleanup を守り欠測として保存し、他の採取を破棄しない。
- ポータル不通: 採取開始と重複投入を止め、復旧後はジョブを再確認する。
- 計測で不具合: 保存した原本と停止手順で戻し、差分を記録してから同期を再開する。

# 完了条件

- 実測・欠測・条件差と採否判断が Issue / Release / チャットにあり、正式な比較用か分析用かを区別している。
- 後続の改善は問題と根拠を持つ個別 Issue / PR で管理する。
