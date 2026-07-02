#!/usr/bin/env bash
# POST Playwright workflow_run results to uplbtools/discord-bot /notifications.
# Invoked from .github/workflows/discord-notify-e2e.yml (workflow_run listener).
set -euo pipefail

: "${GATEWAY_URL:?}"
: "${SECRET:?}"
: "${GH_TOKEN:?}"

RUN_ID="${WORKFLOW_RUN_ID:?}"
REPO="${GITHUB_REPOSITORY:?}"
WORKFLOW_NAME="${WORKFLOW_NAME:?}"
CONCLUSION="${CONCLUSION:?}"
BRANCH="${HEAD_BRANCH:?}"
SHA="${HEAD_SHA:?}"
RUN_URL="${HTML_URL:?}"
EVENT="${RUN_EVENT:?}"
RUN_DURATION_MS="${RUN_DURATION:-0}"

if [[ "$CONCLUSION" == "success" || "$CONCLUSION" == "skipped" ]]; then
  echo "Skip notify: conclusion=$CONCLUSION"
  exit 0
fi

case "$WORKFLOW_NAME" in
  "E2E") NOTIFY_TYPE="ci.e2e.failed"; SUITE="blocking" ;;
  "E2E advisory") NOTIFY_TYPE="ci.e2e.advisory.failed"; SUITE="advisory" ;;
  "E2E staging") NOTIFY_TYPE="ci.staging-e2e.failed"; SUITE="blocking" ;;
  "Staging smoke") NOTIFY_TYPE="ci.staging-smoke.failed"; SUITE="staging-smoke" ;;
  *)
    echo "Unknown workflow name: $WORKFLOW_NAME"
    exit 0
    ;;
esac

PR_DATA=$(gh api "repos/${REPO}/commits/${SHA}/pulls" --jq '.[0] // null' 2>/dev/null || echo "null")
PR_NUMBER=$(echo "$PR_DATA" | jq 'if . == null then null else .number end')
PR_URL=$(echo "$PR_DATA" | jq 'if . == null then null else .html_url end')

FAILED_STEP=$(gh api "repos/${REPO}/actions/runs/${RUN_ID}/jobs" \
  --jq '[.jobs[].steps[] | select(.conclusion=="failure") | .name] | first // empty' 2>/dev/null || true)

INTEGRATION_FAILED="false"
if [[ "$FAILED_STEP" == *"Integration"* ]]; then
  INTEGRATION_FAILED="true"
fi

ARTIFACT_NAME="playwright-report-${SUITE}-${RUN_ID}"
if [[ "$SUITE" == "staging-smoke" ]]; then
  ARTIFACT_NAME=""
fi

IDEM_TYPE="${NOTIFY_TYPE/ci./ci:}"
IDEMPOTENCY_KEY="${IDEM_TYPE}:${WORKFLOW_NAME}:${RUN_ID}"
OCCURRED_AT=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
DURATION_SEC=$(( RUN_DURATION_MS / 1000 ))

payload=$(jq -n \
  --arg type "$NOTIFY_TYPE" \
  --arg occurredAt "$OCCURRED_AT" \
  --arg idempotencyKey "$IDEMPOTENCY_KEY" \
  --arg repo "$REPO" \
  --arg workflow "$WORKFLOW_NAME" \
  --arg workflowUrl "$RUN_URL" \
  --arg conclusion "$CONCLUSION" \
  --arg branch "$BRANCH" \
  --arg commitSha "$SHA" \
  --argjson prNumber "$PR_NUMBER" \
  --argjson prUrl "$PR_URL" \
  --arg suite "$SUITE" \
  --arg failedStep "$FAILED_STEP" \
  --argjson integrationFailed "$INTEGRATION_FAILED" \
  --arg artifactName "$ARTIFACT_NAME" \
  --argjson durationSeconds "$DURATION_SEC" \
  --arg trigger "$EVENT" \
  '{
    schemaVersion: 1,
    type: $type,
    source: "github",
    occurredAt: $occurredAt,
    idempotencyKey: $idempotencyKey,
    payload: {
      repo: $repo,
      workflow: $workflow,
      workflowUrl: $workflowUrl,
      conclusion: $conclusion,
      branch: $branch,
      commitSha: $commitSha,
      prNumber: $prNumber,
      prUrl: $prUrl,
      suite: $suite,
      failedStep: (if $failedStep == "" then null else $failedStep end),
      integrationFailed: $integrationFailed,
      artifactName: (if $artifactName == "" then null else $artifactName end),
      durationSeconds: $durationSeconds,
      trigger: $trigger
    }
  }')

echo "Posting $NOTIFY_TYPE for $WORKFLOW_NAME run $RUN_ID"
curl -sfS -X POST "$GATEWAY_URL" \
  -H "Content-Type: application/json" \
  -H "x-notification-secret: $SECRET" \
  -d "$payload"
