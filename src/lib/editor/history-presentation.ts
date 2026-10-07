import { crFacilityLabel } from "@constants/cr-facilities";
import { orgCategoryLabel } from "@constants/org-categories";
import { placeCategoryLabel } from "@constants/place-categories";
import { roomCategoryLabel } from "@constants/room-categories";
import { distanceMeters } from "@lib/campus-route";
import { CAMPUS_TIME_ZONE } from "@lib/event-time";
import type { FieldDiff } from "@lib/proposals/diff";

/** One run of a word-level diff: kept, removed, or added text. */
export type DiffPart = { text: string; op: "same" | "del" | "ins" };

/** A history change as the public history view draws it. */
export type HistoryChangeView =
  | {
      kind: "value";
      field: string;
      label: string;
      before: string | null;
      after: string | null;
    }
  | { kind: "words"; field: string; label: string; parts: DiffPart[] }
  | { kind: "note"; field: string; label: string; text: string };

// Stored codes a visitor should never read raw ("hand-dryer", "student-org").
const VALUE_LABELS: Record<string, (value: string) => string | null> = {
  crFacilities: crFacilityLabel,
  category: (value) =>
    orgCategoryLabel(value) ??
    roomCategoryLabel(value) ??
    placeCategoryLabel(value),
};

// Fields whose values are codes from a fixed list, not free text.
const CODE_FIELDS = new Set([
  "crFacilities",
  "category",
  "buildingType",
  "orgType",
  "gender",
  "recurrence",
]);

/** "every_1st_sem" → "Every 1st sem", "hand-dryer" → "Hand dryer". */
function humanizeCode(value: string): string {
  const words = value.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function displayValue(field: string, value: string | null): string | null {
  if (value === null || !CODE_FIELDS.has(field)) return value;
  // Arrays arrive pre-joined with ", " (see formatValue in proposals/diff).
  return value
    .split(", ")
    .map((item) => {
      const known = VALUE_LABELS[field]?.(item);
      return known && known !== item ? known : humanizeCode(item);
    })
    .join(", ");
}

// Longer than this, a before/after pair is shown as one marked-up passage.
const WORD_DIFF_MIN_LENGTH = 60;
// Token grid cap: past this a paragraph rewrite just shows both versions.
const WORD_DIFF_MAX_CELLS = 250_000;

/** Word-level diff (LCS over words and the spaces between them). */
export function wordDiff(before: string, after: string): DiffPart[] | null {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  if (a.length * b.length > WORD_DIFF_MAX_CELLS) return null;
  const lcs = Array.from(
    { length: a.length + 1 },
    () => new Uint32Array(b.length + 1),
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i]![j] =
        a[i] === b[j]
          ? lcs[i + 1]![j + 1]! + 1
          : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const parts: DiffPart[] = [];
  const push = (text: string, op: DiffPart["op"]) => {
    const last = parts.at(-1);
    if (last?.op === op) last.text += text;
    else parts.push({ text, op });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(a[i]!, "same");
      i += 1;
      j += 1;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      push(a[i]!, "del");
      i += 1;
    } else {
      push(b[j]!, "ins");
      j += 1;
    }
  }
  while (i < a.length) push(a[i++]!, "del");
  while (j < b.length) push(b[j++]!, "ins");
  return groupChanges(parts.filter((part) => part.text !== ""));
}

/**
 * "in front of" → "right behind" diffs word by word into alternating
 * removed/added scraps around the shared spaces. Fold each run of changes
 * (and the spaces inside it) into one removed phrase then one added phrase.
 */
function groupChanges(parts: DiffPart[]): DiffPart[] {
  const out: DiffPart[] = [];
  let k = 0;
  while (k < parts.length) {
    if (parts[k]!.op === "same") {
      out.push(parts[k]!);
      k += 1;
      continue;
    }
    let del = "";
    let ins = "";
    while (k < parts.length) {
      const part = parts[k]!;
      if (part.op === "del") del += part.text;
      else if (part.op === "ins") ins += part.text;
      else if (
        /^\s+$/.test(part.text) &&
        parts[k + 1] &&
        parts[k + 1]!.op !== "same"
      ) {
        del += part.text;
        ins += part.text;
      } else break;
      k += 1;
    }
    if (del) out.push({ text: del, op: "del" });
    if (ins) out.push({ text: ins, op: "ins" });
  }
  return out;
}

function toNumber(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pinChange(
  lat: FieldDiff | undefined,
  lon: FieldDiff | undefined,
): HistoryChangeView {
  const field = "location";
  const label = "Map pin";
  // Only the changed axis is in the diff. The other held still, so it is the
  // same (unknown) value on both sides and 0 stands in for it.
  const before = {
    lat: lat ? toNumber(lat.before) : 0,
    lon: lon ? toNumber(lon.before) : 0,
  };
  const after = {
    lat: lat ? toNumber(lat.after) : 0,
    lon: lon ? toNumber(lon.after) : 0,
  };
  const hadPin = before.lat !== null && before.lon !== null;
  const hasPin = after.lat !== null && after.lon !== null;
  if (!hasPin) {
    return { kind: "note", field, label, text: "Removed from the map" };
  }
  if (!hadPin) return { kind: "note", field, label, text: "Placed on the map" };
  const meters = distanceMeters(
    { lat: before.lat ?? 0, lon: before.lon ?? 0 },
    { lat: after.lat ?? 0, lon: after.lon ?? 0 },
  );
  const text =
    meters < 1
      ? "Nudged slightly"
      : `Moved about ${meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`}`;
  return { kind: "note", field, label, text };
}

/**
 * Turns a history row's field diffs into what a visitor can read: map pins as
 * a distance, stored codes as labels, and long text as a marked-up passage
 * so a one-word fix in a paragraph is visible.
 */
export function presentHistoryChanges(
  changes: readonly FieldDiff[],
  action: string,
): HistoryChangeView[] {
  const lat = changes.find((c) => c.field === "lat");
  const lon = changes.find((c) => c.field === "lon");
  const views: HistoryChangeView[] = [];
  let pinAdded = false;
  for (const change of changes) {
    if (change.field === "lat" || change.field === "lon") {
      if (pinAdded) continue;
      pinAdded = true;
      views.push(
        action === "create"
          ? {
              kind: "note",
              field: "location",
              label: "Map pin",
              text: "Placed on the map",
            }
          : pinChange(lat, lon),
      );
      continue;
    }
    const before = displayValue(change.field, change.before);
    const after = displayValue(change.field, change.after);
    const long =
      Math.max(before?.length ?? 0, after?.length ?? 0) >= WORD_DIFF_MIN_LENGTH;
    const parts =
      action !== "create" && long && before !== null && after !== null
        ? wordDiff(before, after)
        : null;
    views.push(
      parts
        ? { kind: "words", field: change.field, label: change.label, parts }
        : {
            kind: "value",
            field: change.field,
            label: change.label,
            before,
            after,
          },
    );
  }
  return views;
}

/**
 * Edit times in campus time with the zone named, so the same edit reads the
 * same date on every device. Events already show times in Manila time.
 */
export function formatHistoryTime(iso: string, withTime = true): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = date.toLocaleString("en-PH", {
    timeZone: CAMPUS_TIME_ZONE,
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  });
  return withTime ? `${formatted} PHT` : formatted;
}
