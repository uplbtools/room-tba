#!/usr/bin/env python3
"""Assign GitHub Project #2 Iteration field for issues missing a sprint.

Roadmap issues were configured during roadmap bootstrap; this script fills
gaps (legacy closed issues -> Sprint 1, open backlog -> OPEN_SPECIAL).
"""
from __future__ import annotations

import json
import subprocess
import sys
import time

PROJECT_ID = "PVT_kwDOEXQKEs4Bafkj"
FIELD_ITERATION = "PVTIF_lADOEXQKEs4BafkjzhWaWwA"
ITER = {
    1: "1bfaf071",
    2: "86f921f7",
    3: "b37b468c",
    4: "2d6c146a",
    5: "055ff87d",
}

# Open backlog issues not linked in roadmap-bootstrap.sh
OPEN_SPECIAL: dict[int, int] = {
    94: 2,
    98: 5,
    109: 3,
    116: 4,
    122: 5,
    145: 5,
    152: 3,
    156: 5,
    158: 5,
}


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
                    nodes {{ ... on ProjectV2ItemFieldIterationValue {{ title }} }}
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


def assign_iteration(item_id: str, iteration_id: str) -> None:
    query = f"""
    mutation {{
      updateProjectV2ItemFieldValue(input: {{
        projectId: "{PROJECT_ID}"
        itemId: "{item_id}"
        fieldId: "{FIELD_ITERATION}"
        value: {{ iterationId: "{iteration_id}" }}
      }}) {{ projectV2Item {{ id }} }}
    }}
    """
    gql(query)


def main() -> int:
    updates: list[tuple[int, str, int, str]] = []
    for item in fetch_items():
        content = item.get("content") or {}
        number = content.get("number")
        if not number:
            continue
        iteration = next(
            (fv.get("title") for fv in item["fieldValues"]["nodes"] if fv.get("title")),
            None,
        )
        if iteration:
            continue
        sprint = OPEN_SPECIAL.get(number, 1)
        updates.append((number, item["id"], sprint, content.get("title", "")[:50]))

    if not updates:
        print("All project issues already have an Iteration assigned.")
        return 0

    print(f"Assigning Iteration to {len(updates)} issues...")
    for number, item_id, sprint, title in sorted(updates):
        assign_iteration(item_id, ITER[sprint])
        print(f"  #{number} -> Sprint {sprint}  ({title})")
        time.sleep(0.12)

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
