#!/usr/bin/env python3
"""Reorder GitHub Project #2 kanban columns top-to-bottom by Priority field."""
from __future__ import annotations

import json
import subprocess
import sys
import time

PROJECT_ID = "PVT_kwDOEXQKEs4Bafkj"

PRIORITY_RANK = {
    "High Priority": 0,
    "Medium Priority": 1,
    "Low Priority": 2,
}

STATUS_ORDER = ["Backlog", "Ready", "In progress", "In review", "Done"]


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


def fetch_items() -> tuple[list[str], dict[str, dict]]:
    """Return global item id order and item records keyed by id."""
    order: list[str] = []
    records: dict[str, dict] = {}
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
                        field {{ ... on ProjectV2SingleSelectField {{ name }} }}
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
        for node in batch["nodes"]:
            order.append(node["id"])
            records[node["id"]] = node
        if not batch["pageInfo"]["hasNextPage"]:
            break
        cursor = batch["pageInfo"]["endCursor"]
    return order, records


def field_value(item: dict, field_name: str) -> str | None:
    for node in item["fieldValues"]["nodes"]:
        if not node:
            continue
        field = node.get("field") or {}
        if field.get("name") == field_name:
            return node.get("name")
    return None


def sort_key(item: dict) -> tuple:
    content = item.get("content") or {}
    priority = field_value(item, "Priority")
    return (PRIORITY_RANK.get(priority, 99), content.get("number") or 0)


def move_item(item_id: str, after_id: str | None = None) -> None:
    after_clause = f'afterId: "{after_id}"' if after_id else ""
    query = f"""
    mutation {{
      updateProjectV2ItemPosition(input: {{
        projectId: "{PROJECT_ID}"
        itemId: "{item_id}"
        {after_clause}
      }}) {{ clientMutationId }}
    }}
    """
    gql(query)


def column_item_ids(global_order: list[str], records: dict[str, dict], status: str) -> list[str]:
    return [
        item_id
        for item_id in global_order
        if field_value(records[item_id], "Status") == status
    ]


def reorder_status_group(
    status: str,
    global_order: list[str],
    records: dict[str, dict],
    dry_run: bool,
) -> tuple[int, list[str]]:
    current_ids = column_item_ids(global_order, records, status)
    if len(current_ids) < 2:
        return 0, global_order

    items = [records[item_id] for item_id in current_ids]
    desired_ids = [item["id"] for item in sorted(items, key=sort_key)]

    if desired_ids == current_ids:
        return 0, global_order

    moves = 0
    print(f"\n{status} ({len(current_ids)} items) — reordering by priority")

    first_idx = global_order.index(current_ids[0])
    anchor_after = global_order[first_idx - 1] if first_idx > 0 else None

    working_order = global_order[:]

    def apply_move(item_id: str, after_id: str | None) -> None:
        nonlocal moves, working_order
        if dry_run:
            return
        move_item(item_id, after_id)
        moves += 1
        working_order.remove(item_id)
        if after_id is None:
            working_order.insert(0, item_id)
        else:
            working_order.insert(working_order.index(after_id) + 1, item_id)
        time.sleep(0.12)

    if desired_ids[0] != current_ids[0]:
        apply_move(desired_ids[0], anchor_after)

    for index in range(1, len(desired_ids)):
        apply_move(desired_ids[index], desired_ids[index - 1])

    for item_id in desired_ids[:5]:
        item = records[item_id]
        content = item.get("content") or {}
        pri = field_value(item, "Priority") or "—"
        print(
            f"  top → {pri:16} #{content.get('number')} {content.get('title', '')[:50]}"
        )
    if len(desired_ids) > 5:
        print(f"  ... ({len(desired_ids) - 5} more)")

    return moves, working_order


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    global_order, records = fetch_items()

    total_moves = 0
    for status in STATUS_ORDER:
        moves, global_order = reorder_status_group(
            status, global_order, records, dry_run
        )
        total_moves += moves

    if dry_run:
        print("\nDry run complete.")
    else:
        print(f"\nDone — {total_moves} position updates applied.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
