#!/usr/bin/env bash
# 未完了 Issue の調査用スナップショットを JSON で取得する。
set -euo pipefail

usage() { echo "Usage: $0 [OWNER/REPO]" >&2; }
if [[ ${1:-} == --help || ${1:-} == -h ]]; then usage; exit 0; fi
if (( $# > 1 )); then usage; exit 2; fi
command -v gh >/dev/null || { echo 'gh が必要です' >&2; exit 1; }
command -v jq >/dev/null || { echo 'jq が必要です' >&2; exit 1; }
repo=${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}
if [[ ! $repo =~ ^[^/[:space:]]+/[^/[:space:]]+$ ]]; then usage; exit 2; fi
owner=${repo%%/*}; name=${repo#*/}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
# repository.issues は検索 API の 1000 件制限を受けない。
# ネストされた一覧の超過は truncated に記録し、呼び出し側が個別取得する。
gh api graphql --paginate -f owner="$owner" -f name="$name" -f query='query($owner: String!, $name: String!, $endCursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, after: $endCursor, states: OPEN, orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url body state updatedAt
        milestone { title state url }
        assignees(first: 100) { nodes { login } pageInfo { hasNextPage } }
        labels(first: 100) { nodes { name } pageInfo { hasNextPage } }
        blockedBy(first: 100) { nodes { number title state url repository { nameWithOwner } } pageInfo { hasNextPage } }
        parent { number title state url }
        projectItems(first: 100) { nodes { project { title url } fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } pageInfo { hasNextPage } }
        comments(first: 100) { nodes { body url updatedAt } pageInfo { hasNextPage } }
      }
    }
  }
}' > "$tmp/pages.json"
# 出力途中の失敗や GraphQL エラーを候補なしと誤認しない。
jq -e -s '
  if length == 0 or any(.[]; (.errors // [] | length) > 0 or .data.repository.issues == null) then error("GitHub GraphQL response incomplete")
  elif any(.[0:-1][]; .data.repository.issues.pageInfo.hasNextPage != true) or .[-1].data.repository.issues.pageInfo.hasNextPage != false then error("Issue pagination incomplete")
  else {repository: $repo, graphqlPages: length, issues: [.[].data.repository.issues.nodes[] | . as $issue | . + {truncated: (["assignees", "labels", "blockedBy", "projectItems", "comments"] | map(select(. as $k | $issue[$k].pageInfo.hasNextPage != false)))}]} end
' --arg repo "$repo" "$tmp/pages.json" > "$tmp/result.json"
cat "$tmp/result.json"
