import json
import subprocess
import re

done_issues = [455, 456, 612, 445]
update_issues = [499, 454, 453, 452, 451, 450, 448]

def run_cmd(cmd, input_text=None):
    p = subprocess.Popen(cmd, shell=True, stdin=subprocess.PIPE if input_text else None, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = p.communicate(input=input_text.encode() if input_text else None)
    return stdout.decode(), stderr.decode(), p.returncode

# Close done issues
for issue in done_issues:
    print(f"Closing issue {issue}...")
    run_cmd(f'gh issue close {issue} -c "This issue is done based on the current state of the codebase."')

# Read specs
with open("issues_specs.json", "r") as f:
    lines = f.read().strip().split("\n")

for line in lines:
    if not line.strip():
        continue
    data = json.loads(line)
    issue = data["number"]
    if issue not in update_issues:
        continue
    
    body = data["body"]
    
    # Update date
    body = re.sub(r"\*\*Last verified against staging:\*\*.*", "**Last verified against staging:** 2026-07-12", body)
    
    # Update implementation details for 499
    if issue == 499:
        body = body.replace("- **Files / routes:**", "- **Files / routes:** `astro.config.mjs` (the `@vite-pwa/astro` plugin config)")
        
    print(f"Updating issue {issue}...")
    # write body to temp file
    with open(f"temp_body_{issue}.md", "w") as f_out:
        f_out.write(body)
    
    stdout, stderr, rc = run_cmd(f'gh issue edit {issue} --body-file temp_body_{issue}.md')
    if rc != 0:
        print(f"Failed to update {issue}: {stderr}")
    else:
        print(f"Successfully updated {issue}")
