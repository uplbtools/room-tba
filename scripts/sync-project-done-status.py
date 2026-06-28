#!/usr/bin/env python3
"""Sync GitHub Project #2 Status: closed issues -> Done."""
from __future__ import annotations

import json
import subprocess
import sys
import time

PROJECT_ID = "PVT_kwDOEXQKEs4Bafkj"
FIELD_STATUS = "PVTSSF_lADOEXQKEs4BafkjzhVW0RE"
STATUS_DONE = "dba41560"


def gql(query: str) -> dict:
    result = subprocess.run(
        ["gh", "api", "graphql", "-f", f"query={query}"],
        capture_output=True,
        text=True,
        check=True,
    )
    payload = json.loads(result.stdout)
    if errors := payload.get("errors"):
        raise RuntimeError(errors)
    return payload["data"]


def fetch_items() -> list[dict]:
    items: list[dict] = []
    cursor: str | None = None
    while True:
        after = json.dumps(cursor) if cursor else "null"
        query = f"""
        query {{
          node(id: "{PROJECT_ID}") {{
            ... on ProjectV2 {{
              items(first: 100, after: {after}) {{
                pageInfo {{ hasNextPage endCursor }}
                nodes {{
                  id
                  content {{ ... on Issue {{ number title state }} }}
                  fieldValues(first: 25) {{
                    nodes {{
                      ... on ProjectV2ItemFieldSingleSelectValue {{
                        name
                        field {{ ... on ProjectV2FieldCommon {{ name }} }}
                      }}
                    }}
                  }}
                }}
              }}
            }}
          }}
        }}
        """
        batch = gql(query)["node"]["items"]
        items.extend(batch["nodes"])
        if not batch["pageInfo"]["hasNextPage"]:
            break
        cursor = batch["pageInfo"]["endCursor"]
    return items


def set_done(item_id: str) -> None:
    query = f"""
    mutation {{
      updateProjectV2ItemFieldValue(input: {{
        projectId: "{PROJECT_ID}"
        itemId: "{item_id}"
        fieldId: "{FIELD_STATUS}"
        value: {{ singleSelectOptionId: "{STATUS_DONE}" }}
      }}) {{ projectV2Item {{ id }} }}
    }}
    """
    gql(query)


def main() -> int:
    updates: list[tuple[int, str, str | None, str]] = []
    for item in fetch_items():
        content = item.get("content") or {}
        if content.get("state") != "CLOSED":
            continue
        status = next(
            (
                fv.get("name")
                for fv in item["fieldValues"]["nodes"]
                if (fv.get("field") or {}).get("name") == "Status"
            ),
            None,
        )
        if status == "Done":
            continue
        updates.append(
            (
                content["number"],
                item["id"],
                status,
                (content.get("title") or "")[:55],
            )
        )

    if not updates:
        print("All closed project issues are already Done.")
        return 0

    print(f"Moving {len(updates)} closed issues to Done...")
    for number, item_id, old_status, title in sorted(updates):
        set_done(item_id)
        print(f"  #{number} ({old_status or 'none'} -> Done) {title}")
        time.sleep(0.12)

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
