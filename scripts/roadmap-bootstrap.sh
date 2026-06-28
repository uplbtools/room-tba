#!/usr/bin/env bash
set -euo pipefail
REPO="uplbtools/room-tba"
PROJECT_ID="PVT_kwDOEXQKEs4Bafkj"
FIELD_STATUS="PVTSSF_lADOEXQKEs4BafkjzhVW0RE"
FIELD_PRIORITY="PVTSSF_lADOEXQKEs4BafkjzhVW0R0"
FIELD_SIZE="PVTSSF_lADOEXQKEs4BafkjzhVW0Ss"
FIELD_ITERATION="PVTIF_lADOEXQKEs4BafkjzhWaWwA"
FIELD_TRACK="PVTSSF_lADOEXQKEs4BafkjzhWaWwE"
FIELD_START="PVTF_lADOEXQKEs4BafkjzhVW0S0"
FIELD_TARGET="PVTF_lADOEXQKEs4BafkjzhVW0S4"
STATUS_BACKLOG="63c44138"
STATUS_READY="0af8d0be"
PRI_HIGH="a67cb0cb"
PRI_MED="213782af"
PRI_LOW="4128fef8"
SIZE_XS="a0a4f3ca"
SIZE_S="37066f97"
SIZE_M="a7c375b1"
SIZE_L="297a00ad"
SIZE_XL="6c6d1262"
TRACK_ENG="8fea8410"
TRACK_QA="d645dd12"
TRACK_DATA="85acdf52"
TRACK_DESIGN="4006f30c"
TRACK_OUTREACH="b1bef621"
ITER_S1="1bfaf071"
ITER_S2="86f921f7"
ITER_S3="b37b468c"
ITER_S4="2d6c146a"
ITER_S5="055ff87d"

create_issue() {
  local title="$1" body="$2" labels="$3"
  gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels"
}

get_issue_id() {
  gh issue view "$1" --repo "$REPO" --json id -q .id
}

get_issue_num_from_url() {
  echo "$1" | sed 's|.*/||'
}

link_subissue() {
  local parent_num="$1" child_num="$2"
  local parent_id child_id
  parent_id=$(get_issue_id "$parent_num")
  child_id=$(get_issue_id "$child_num")
  gh api graphql -f query="mutation { addSubIssue(input: {issueId: \"$parent_id\" subIssueId: \"$child_id\"}) { issue { id } } }" >/dev/null 2>&1 || true
}

P0="${1:-217}"
P1="${2:-}"
P2="${3:-}"
P3="${4:-}"
P4="${5:-}"
P5="${6:-}"

if [[ -z "$P1" ]]; then
  P1=$(get_issue_num_from_url "$(create_issue "[EPIC] Data trust and Neon-first pipeline" "Sprint 1 parent epic." "parent issue,enhancement")")
  P2=$(get_issue_num_from_url "$(create_issue "[EPIC] Schedule relaunch and design system" "Sprint 2 parent epic." "parent issue,enhancement")")
  P3=$(get_issue_num_from_url "$(create_issue "[EPIC] Orgs, events and contributor platform" "Sprint 3 parent epic." "parent issue,enhancement")")
  P4=$(get_issue_num_from_url "$(create_issue "[EPIC] Performance, PWA growth and sponsorship foundation" "Sprint 4 parent epic." "parent issue,enhancement")")
  P5=$(get_issue_num_from_url "$(create_issue "[EPIC] Production launch and campus partnerships" "Sprint 5 parent epic." "parent issue,enhancement")")
fi

echo "Parents P0=$P0 P1=$P1 P2=$P2 P3=$P3 P4=$P4 P5=$P5"

link_new() {
  local parent="$1" title="$2" body="$3" labels="$4"
  local num
  num=$(get_issue_num_from_url "$(create_issue "$title" "$body" "$labels")")
  link_subissue "$parent" "$num"
  echo "$num"
}

# P0
link_new "$P0" "[QA] Publish volunteer QA issue template and screenshot how-to" "QA template: device, URL, steps, expected, actual, screenshots. No code." "sub-issue,qa,good first issue,documentation"
link_new "$P0" "[DATA] Publish volunteer DATA issue template and spreadsheet links" "Data template + Google Sheet for pin audits." "sub-issue,data,good first issue,documentation"
link_new "$P0" "[DOCS] Weekly volunteer triage ritual" "30-min weekly triage process doc." "sub-issue,documentation"

# S1 eng/data/qa
link_new "$P1" "PGlite schema parity with Drizzle migrations" "Sync pgliteDB.ts with drizzle/ schema." "sub-issue,enhancement"
link_new "$P1" "Classes PGlite sync and client app load" "Wire classes into sync.ts and AppRoot. Blocks Sprint 2." "sub-issue,enhancement"
link_new "$P1" "[DATA] Room pin audit — Batch 1 (50 buildings)" "Spreadsheet audit. No code." "sub-issue,data,good first issue"
link_new "$P1" "[DATA] Report wrong room codes via issue template" "Triage into #161." "sub-issue,data,good first issue"
link_new "$P1" "[DATA] Verify dorm metadata (10 dorms)" "Cross-check vs official pages." "sub-issue,data,good first issue"
link_new "$P1" "[DATA] Campus events seed list for next term" "Spreadsheet for editors." "sub-issue,data"
link_new "$P1" "[QA] Sprint 1 smoke checklist — browse and offline" "docs/agentic-qa-process.md at 320px + desktop." "sub-issue,qa,good first issue"
link_new "$P1" "[QA] Sync toast and status bar regression" "Verify sync states." "sub-issue,qa,good first issue"
link_new "$P1" "[QA] Editor pin move manual pass" "editor-foundation-test-plan.md §1-3." "sub-issue,qa"

# S2
link_new "$P2" "Re-enable class search and room schedules in SPA" "Uncomment ClassQuery/RoomResult/ScheduleModal." "sub-issue,enhancement"
link_new "$P2" "Theme schedule canvas to Room TBA design tokens" "schedule-renderer.ts uses design tokens." "sub-issue,enhancement,design improvement"
link_new "$P2" "Mobile schedule UX pass (320px)" "Side panel + modal layout." "sub-issue,enhancement"
link_new "$P2" "[DATA] Verify 20 course codes map to room schedules" "AMIS cross-check." "sub-issue,data,good first issue"
link_new "$P2" "[DATA] Term calendar dates one-pager" "Sem dates for term selector." "sub-issue,data,good first issue,documentation"
link_new "$P2" "[DATA] Alias and synonym suggestions spreadsheet" "For #155." "sub-issue,data,good first issue"
link_new "$P2" "[QA] Schedule UAT — 10 rooms x 3 courses" "Screenshot grid in comments." "sub-issue,qa,good first issue"
link_new "$P2" "[QA] Class search empty and error states" "Edge cases." "sub-issue,qa,good first issue"
link_new "$P2" "[QA] Visual pass — schedule matches map chrome" "Design consistency." "sub-issue,qa,design improvement"

# S3
link_new "$P3" "Org profiles and stable URL slugs" "College/division metadata + slugs." "sub-issue,enhancement"
link_new "$P3" "[DATA] Gate and entry point coordinates spreadsheet" "For #157." "sub-issue,data,good first issue"
link_new "$P3" "[DATA] Event images and metadata pack (5 events)" "Images + alt text." "sub-issue,data,good first issue"
link_new "$P3" "[DATA] College and division blurbs" "Official site copy." "sub-issue,data,good first issue"
link_new "$P3" "[DATA] Buildings without classrooms inventory" "For #15." "sub-issue,data,good first issue"
link_new "$P3" "[QA] Editor regression — full test plan" "Full editor test plan run." "sub-issue,qa"
link_new "$P3" "[QA] Events list and map focus pass" "5 events end-to-end." "sub-issue,qa,good first issue"
link_new "$P3" "[QA] Contributor proposal happy path" "After #208." "sub-issue,qa"

# S4
link_new "$P4" "Incremental delta sync for PGlite tables" "Reduce full refetch in sync.ts." "sub-issue,enhancement,performance improvement"
link_new "$P4" "Campus partnership schema and admin CRUD" "Campus-native sponsors only." "sub-issue,enhancement"
link_new "$P4" "[DATA] Campus partner prospect list (10 orgs)" "Partner spreadsheet." "sub-issue,data,good first issue"
link_new "$P4" "[DATA] Food and study POI draft pins (15 POIs)" "For #160." "sub-issue,data,good first issue"
link_new "$P4" "[DATA] Offline maps test campus zones" "Walk test zones." "sub-issue,data,good first issue"
link_new "$P4" "[QA] Offline mode walkthrough" "Airplane mode test + #101 copy." "sub-issue,qa,good first issue"
link_new "$P4" "[QA] PWA install screenshots — Android and iOS" "For #213 doc." "sub-issue,qa,good first issue"
link_new "$P4" "[QA] Performance spot-check (3 devices)" "TTI notes." "sub-issue,qa"

# S5
link_new "$P5" "Campus partner UI surfaces (labeled placements)" "Calm partner chips/cards." "sub-issue,enhancement"
link_new "$P5" "Smoke test automation v1" "Playwright from QA doc." "sub-issue,enhancement,qa"
link_new "$P5" "[DATA] Launch partner pack (3 partners live)" "Approved copy + logos." "sub-issue,data"
link_new "$P5" "[QA] Launch sign-off checklist" "Final blocker sign-off." "sub-issue,qa"
link_new "$P5" "[QA] SEO spot-check (10 room URLs)" "OG screenshots." "sub-issue,qa,good first issue"
link_new "$P5" "[QA] Accessibility quick pass" "Keyboard/contrast/320px." "sub-issue,qa,good first issue"
link_new "$P5" "[QA] Changelog and version label verify" "Footer version check." "sub-issue,qa,good first issue"

for pair in "$P1:117" "$P1:161" "$P1:169" "$P1:142" "$P2:31" "$P2:43" "$P2:162" "$P2:155" "$P3:208" "$P3:203" "$P3:202" "$P3:191" "$P3:157" "$P3:127" "$P3:15" "$P4:121" "$P4:101" "$P4:213" "$P4:212" "$P4:214" "$P4:207" "$P4:160" "$P5:128" "$P5:111" "$P5:149" "$P5:206" "$P5:115" "$P5:216" "$P5:39" "$P5:108"; do
  parent="${pair%%:*}"; child="${pair##*:}"
  link_subissue "$parent" "$child"
  echo "linked #$child -> #$parent"
done

gh issue edit 108 --repo "$REPO" --add-label "good first issue" 2>/dev/null || true
gh issue edit 127 --repo "$REPO" --add-label "good first issue" 2>/dev/null || true
gh issue edit 207 --repo "$REPO" --add-label "good first issue,qa" 2>/dev/null || true
gh issue edit 142 --repo "$REPO" --add-label "good first issue" 2>/dev/null || true

echo "BOOTSTRAP_DONE P0=$P0 P1=$P1 P2=$P2 P3=$P3 P4=$P4 P5=$P5"
