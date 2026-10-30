const fs = require('node:fs');
const path = require('node:path');

const milestoneDescriptions = {
  '01 事前準備': '競技のルールを確認し、作業環境・連絡手段・リポジトリを準備する。\n\n目標スコア: 計測前のため未設定。',
  '02 競技直前': '準備状況と接続・作業手順を確認し、開始後すぐに着手できる状態にする。\n\n目標スコア: 計測前のため未設定。',
  '03 競技開始直後': '接続とポータルを確認し、提供状態で初回ベンチを実行して基準スコアを記録する。\n\n目標スコア: 初回ベンチを成功させ、基準スコアを取得する。',
  '04 競技序盤': '計測環境を整え、ボトルネックを把握して効果の大きい改善に着手する。\n\n目標スコア: 初回ベンチの基準スコアを上回る。',
  '05 競技中盤': '計測と改善を繰り返し、正しさを保ちながら主要なボトルネックを解消する。\n\n目標スコア: 序盤の最高スコアを上回る。',
  '06 競技終盤': '有効な改善を仕上げ、提出構成で最終ベンチと動作確認を行う。\n\n目標スコア: 提出構成で、それまでの最高スコア以上を目指す。',
  '07 競技終了後': '結果と変更・計測の記録を整理し、振り返りを行う。\n\n目標スコア: 競技中の最終スコアを記録する。',
};
const milestoneTitles = Object.keys(milestoneDescriptions);

// The task format intentionally supports only strings, booleans and string lists.
function parseTask(filename, text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: front matter がありません`);
  const meta = {};
  let list;
  const scalar = value => {
    if (value.startsWith('"')) return JSON.parse(value);
    if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
    return value;
  };
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const item = line.match(/^  - (.+)$/);
    if (item && list) { meta[list].push(scalar(item[1])); continue; }
    const field = line.match(/^(title|milestone|labels|depends_on|needs-user-action):\s*(.*)$/);
    if (!field || Object.hasOwn(meta, field[1])) throw new Error(`${filename}: 不正なメタデータ: ${line}`);
    const [, key, value] = field;
    list = undefined;
    if (key === 'labels' || key === 'depends_on') {
      if (value !== '' && value !== '[]') throw new Error(`${filename}: ${key} はブロックリストまたは [] を使用`);
      meta[key] = [];
      if (!value) list = key;
    } else if (key === 'needs-user-action') {
      if (!['true', 'false'].includes(value)) throw new Error(`${filename}: boolean が必要`);
      meta[key] = value === 'true';
    } else meta[key] = scalar(value);
  }
  if (!meta.title || !Array.isArray(meta.labels) || !meta.labels.length || !Array.isArray(meta.depends_on) || !match[2].trim()) {
    throw new Error(`${filename}: title / labels / depends_on / 本文が必要`);
  }
  if (!milestoneTitles.includes(meta.milestone)) throw new Error(`${filename}: 不正な milestone`);
  for (const label of meta.labels) {
    if (!/^type:[a-z0-9-]+$/.test(label)) throw new Error(`${filename}: 不正な label ${label}`);
  }
  return { filename, title: meta.title, milestone: meta.milestone, labels: [...new Set([...meta.labels, ...(meta['needs-user-action'] ? ['needs-user-action'] : [])])], dependencies: meta.depends_on, body: match[2].trim(), needsUserAction: meta['needs-user-action'] === true };
}

function loadTasks(directory) {
  const tasks = fs.readdirSync(directory).filter(f => f.endsWith('.md') && f !== 'README.md').sort()
    .map(filename => parseTask(filename, fs.readFileSync(path.join(directory, filename), 'utf8')));
  if (!tasks.length) throw new Error('タスクがありません');
  const byName = new Map(tasks.map(t => [t.filename, t]));
  const done = new Set(), visiting = new Set();
  function visit(name) {
    if (!byName.has(name)) throw new Error(`不明な依存先: ${name}`);
    if (visiting.has(name)) throw new Error(`循環依存: ${name}`);
    if (done.has(name)) return;
    visiting.add(name);
    for (const dependency of byName.get(name).dependencies) visit(dependency);
    visiting.delete(name); done.add(name);
  }
  tasks.forEach(t => visit(t.filename));
  return tasks;
}

const marker = filename => `<!-- task-template: ${filename} -->`;
const parentTitle = 'ISUCON 共通タスク';
const parentMarker = '<!-- common-task-parent -->';
function unique(items, predicate, description) {
  const found = items.filter(predicate);
  if (found.length > 1) throw new Error(`重複しています: ${description}`);
  return found[0];
}

async function createTaskIssues({ github, context, directory = 'tasks' }) {
  const tasks = loadTasks(directory); // Validate everything before any mutation.
  const repo = context.repo;
  const issues = (await github.paginate(github.rest.issues.listForRepo, { ...repo, state: 'all', per_page: 100 }))
    .filter(issue => !issue.pull_request);
  let parent = unique(issues, i => i.title === parentTitle || (i.body || '').includes(parentMarker), parentTitle);
  const existing = new Map(tasks.map(t => [t.filename, unique(issues, i => (i.body || '').includes(marker(t.filename)), t.filename)]));
  const labels = new Set((await github.paginate(github.rest.issues.listLabelsForRepo, { ...repo, per_page: 100 })).map(l => l.name));
  for (const name of new Set(['type:task', ...tasks.flatMap(t => t.labels)])) {
    if (!labels.has(name)) await github.rest.issues.createLabel({ ...repo, name, color: name === 'needs-user-action' ? 'FBCA04' : 'C5DEF5' });
  }
  const milestones = await github.paginate(github.rest.issues.listMilestones, { ...repo, state: 'all', per_page: 100 });
  const milestoneNumbers = new Map();
  for (const title of milestoneTitles) {
    let milestone = unique(milestones, m => m.title === title, title);
    if (!milestone) milestone = (await github.rest.issues.createMilestone({ ...repo, title, description: milestoneDescriptions[title] })).data;
    milestoneNumbers.set(title, milestone.number);
  }
  if (!parent) parent = (await github.rest.issues.create({ ...repo, title: parentTitle, labels: ['type:task'], body: `共通タスクの進行状況を管理する親 Issue です。\n\n${parentMarker}` })).data;
  const children = await github.paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', { ...repo, issue_number: parent.number, per_page: 100 });
  const childIds = new Set(children.map(i => i.id));
  for (const task of tasks) {
    let issue = existing.get(task.filename);
    if (!issue) {
      // Templates can provide their own task-specific questions. Do not ask every
      // task for server names or an execution window (e.g. reading regulations).
      const question = task.needsUserAction && !/^#{1,2} (?:必要な情報|ユーザー確認)$/m.test(task.body)
        ? `## 必要な情報\n\nタスクは実行を前提とし、不足情報がある場合だけ確認する。\n\n必要な情報は、本文の前提条件・対象・作業に記載したこのタスク固有の項目だけを確認する。既に許可された対象・範囲は再質問しない。秘密情報そのものは記載しない。\n\n`
        : '';
      issue = (await github.rest.issues.create({ ...repo, title: task.title, milestone: milestoneNumbers.get(task.milestone), labels: task.labels, body: `${question}${task.body}\n\n${marker(task.filename)}` })).data;
      existing.set(task.filename, issue);
    }
    // Separate creation and linking so a failed linking operation is recoverable.
    if (!childIds.has(issue.id)) {
      await github.request('POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', { ...repo, issue_number: parent.number, sub_issue_id: issue.id });
      childIds.add(issue.id);
    }
  }
  for (const task of tasks) {
    const issue = existing.get(task.filename);
    const dependencies = await github.paginate('GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by', { ...repo, issue_number: issue.number, per_page: 100 });
    const ids = new Set(dependencies.map(i => i.id));
    for (const name of task.dependencies) {
      const dependency = existing.get(name);
      if (!ids.has(dependency.id)) {
        await github.request('POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by', { ...repo, issue_number: issue.number, issue_id: dependency.id });
        ids.add(dependency.id);
      }
    }
  }
  const indexPath = path.join(directory, 'README.md');
  const index = fs.readFileSync(indexPath, 'utf8');
  const linkedIndex = index.replace(/\]\(([^)\r\n]+)\)/g, (link, filename) => {
    const issue = existing.get(filename);
    return issue ? `](${issue.html_url})` : link;
  });
  if (linkedIndex !== index) fs.writeFileSync(indexPath, linkedIndex);
  return parent.html_url;
}
module.exports = { parseTask, loadTasks, createTaskIssues };
if (require.main === module) console.log(`${loadTasks(process.argv[2] || 'tasks').length} tasks validated`);
