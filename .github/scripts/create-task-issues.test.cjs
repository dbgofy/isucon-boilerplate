const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createTaskIssues, loadTasks } = require('./create-task-issues.cjs');

const context = { repo: { owner: 'team', repo: 'contest' } };
const issueUrl = number => `https://github.com/team/contest/issues/${number}`;

function temporaryTasks(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'common-tasks-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function mockGithub(initialIssues = []) {
  const issues = structuredClone(initialIssues);
  const labels = [];
  const children = new Set();
  const dependencies = new Map();
  let nextNumber = Math.max(0, ...issues.map(issue => issue.number)) + 1;
  const state = { issues, children, dependencies, writes: 0, failDependency: false };
  const github = {
    rest: { issues: {
      listForRepo() {},
      listLabelsForRepo() {},
      async createLabel({ name }) {
        state.writes++;
        labels.push({ name });
      },
      async create({ title, body, labels }) {
        state.writes++;
        const number = nextNumber++;
        const issue = { id: number + 1000, number, title, body, labels, state: 'open', html_url: issueUrl(number) };
        issues.push(issue);
        return { data: issue };
      },
    } },
    async paginate(endpoint, params) {
      if (endpoint === github.rest.issues.listForRepo) return issues;
      if (endpoint === github.rest.issues.listLabelsForRepo) return labels;
      if (endpoint.endsWith('/sub_issues')) return [...children].map(id => ({ id }));
      if (endpoint.endsWith('/dependencies/blocked_by')) {
        return [...(dependencies.get(params.issue_number) || [])].map(id => ({ id }));
      }
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    },
    async request(endpoint, params) {
      if (endpoint.endsWith('/sub_issues')) {
        state.writes++;
        children.add(params.sub_issue_id);
        return;
      }
      if (endpoint.endsWith('/dependencies/blocked_by')) {
        if (state.failDependency) {
          state.failDependency = false;
          throw new Error('dependency registration failed');
        }
        state.writes++;
        if (!dependencies.has(params.issue_number)) dependencies.set(params.issue_number, new Set());
        dependencies.get(params.issue_number).add(params.issue_id);
        return;
      }
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    },
  };
  return { github, state };
}

test('all task index links still work after initialization removes the templates', async t => {
  const directory = temporaryTasks(t);
  fs.cpSync(path.resolve(__dirname, '../../tasks'), directory, { recursive: true });
  const tasks = loadTasks(directory);
  assert.ok(tasks.length > 0);
  const indexPath = path.join(directory, 'README.md');
  const original = tasks.map(task => `[${task.title}](${task.filename})`).join('\n') + '\n';
  fs.writeFileSync(indexPath, original);
  const { github, state } = mockGithub();

  await createTaskIssues({ github, context, directory });

  let expected = original;
  for (const task of tasks) {
    const issue = state.issues.find(issue => issue.body.includes(`<!-- task-template: ${task.filename} -->`));
    assert.ok(original.includes(`](${task.filename})`), `missing index link: ${task.filename}`);
    expected = expected.replaceAll(`](${task.filename})`, `](${issue.html_url})`);
    fs.unlinkSync(path.join(directory, task.filename));
  }
  const index = fs.readFileSync(indexPath, 'utf8');
  assert.equal(index, expected);
  assert.equal((index.match(/\]\(https:\/\/github\.com\/team\/contest\/issues\/\d+\)/g) || []).length, tasks.length);
  assert.deepEqual(fs.readdirSync(directory), ['README.md']);
});

test('a failed dependency leaves the index intact and retries reuse existing issues', async t => {
  const directory = temporaryTasks(t);
  fs.writeFileSync(path.join(directory, 'a.md'), '---\ntitle: A\nlabels:\n  - type:task\ndepends_on: []\n---\nTask A\n');
  fs.writeFileSync(path.join(directory, 'b.md'), '---\ntitle: B\nlabels:\n  - type:task\ndepends_on:\n  - a.md\n---\nTask B\n');
  const original = '[A](a.md)\n[B](b.md)\n[Guide](guide.md)\n[External](https://example.com/)\n';
  const indexPath = path.join(directory, 'README.md');
  fs.writeFileSync(indexPath, original);
  const parent = { id: 1010, number: 10, title: 'ISUCON 共通タスク', body: '<!-- common-task-parent -->', html_url: issueUrl(10) };
  const existing = { id: 1011, number: 11, title: 'Edited A', body: 'User notes\n<!-- task-template: a.md -->', labels: ['custom'], state: 'closed', html_url: issueUrl(11) };
  const { github, state } = mockGithub([parent, existing]);
  state.children.add(existing.id);
  state.failDependency = true;

  await assert.rejects(createTaskIssues({ github, context, directory }), /dependency registration failed/);
  assert.equal(fs.readFileSync(indexPath, 'utf8'), original);
  assert.equal(state.issues.length, 3);

  assert.equal(await createTaskIssues({ github, context, directory }), parent.html_url);
  assert.equal(state.issues.length, 3);
  assert.deepEqual(state.issues.find(issue => issue.id === existing.id), existing);
  const expected = original.replace('](a.md)', `](${issueUrl(11)})`).replace('](b.md)', `](${issueUrl(12)})`);
  assert.equal(fs.readFileSync(indexPath, 'utf8'), expected);
  assert.deepEqual([...state.dependencies.get(12)], [existing.id]);

  const writes = state.writes;
  await createTaskIssues({ github, context, directory });
  assert.equal(state.writes, writes);
  assert.equal(fs.readFileSync(indexPath, 'utf8'), expected);
});


test('a README without task index links remains unchanged', async t => {
  const directory = temporaryTasks(t);
  fs.writeFileSync(path.join(directory, 'a.md'), '---\ntitle: A\nlabels:\n  - type:task\ndepends_on: []\n---\nTask A\n');
  const original = '# Operations\n\nManage progress in the common parent issue.\n';
  const indexPath = path.join(directory, 'README.md');
  fs.writeFileSync(indexPath, original);
  const { github } = mockGithub();

  await createTaskIssues({ github, context, directory });

  assert.equal(fs.readFileSync(indexPath, 'utf8'), original);
});
