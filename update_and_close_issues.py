import subprocess
import json
import re
from datetime import datetime

# Issues to close
issues_to_close = {
    499: "Implemented `registerType: 'autoUpdate'` in `astro.config.mjs` for the PWA plugin.",
    556: "Refactored `StatusBar.svelte` and `SyncStatus.svelte` to use a shared `getSyncLadderState()` derivation.",
    557: "Implemented AMIS day token normalization to canonicalize tokens during import rather than in the parser.",
    630: "Added `note` field to `PlannedSection` and a UI text input in the planner sidebar.",
    637: "Superseded by #499. The reload prompt was removed entirely as the service worker now auto-updates.",
    644: "Superseded by #499. The reload prompt was removed entirely as the service worker now auto-updates.",
}

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, text=True, capture_output=True)
    if result.returncode != 0:
        print(f"Error running {cmd}: {result.stderr}")
    return result.stdout

# Close issues
for issue, reason in issues_to_close.items():
    print(f"Closing #{issue}...")
    run_cmd(f'gh issue close {issue} -c "{reason}"')

# Get remaining open issues
open_issues_json = run_cmd("gh issue list --state open --json number,body")
open_issues = json.loads(open_issues_json)

today = datetime.now().strftime("%Y-%m-%d")

for issue in open_issues:
    num = issue["number"]
    body = issue["body"]
    
    # Don't try to update issues we just closed or don't have the string
    if num in issues_to_close:
        continue
        
    if "Last verified against staging:" in body:
        new_body = re.sub(r"Last verified against staging:.*", f"Last verified against staging: {today}", body)
        if new_body != body:
            print(f"Updating #{num} with new date...")
            # Save to temp file to pass to gh
            with open("/tmp/issue_body.txt", "w") as f:
                f.write(new_body)
            run_cmd(f'gh issue edit {num} --body-file /tmp/issue_body.txt')
            
print("Done.")
