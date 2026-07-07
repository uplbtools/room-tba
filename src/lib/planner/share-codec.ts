import type { PlannerPlan } from "./types.js";

export type SharedSectionRef = {
  courseCode: string;
  section: string;
  type: string;
};

export type DecodedSharePlan = {
  termId: number;
  refs: SharedSectionRef[];
};

type SharePayload = {
  v: 1;
  t: number;
  s: [string, string, string][]; // [courseCode, section, type]
};

const toBase64Url = (text: string): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const fromBase64Url = (encoded: string): string => {
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/** Encode a plan's natural keys for a `?plan=` share URL (~300 chars for 10 sections). */
export function encodeSharePlan(plan: PlannerPlan): string {
  const payload: SharePayload = {
    v: 1,
    t: plan.termId,
    s: plan.sections.map((s) => [s.courseCode, s.section, s.type]),
  };
  return toBase64Url(JSON.stringify(payload));
}

/** Decode a `?plan=` payload. Null on any parse/shape error. */
export function decodeSharePlan(raw: string | null): DecodedSharePlan | null {
  if (!raw) return null;
  try {
    const payload: unknown = JSON.parse(fromBase64Url(raw));
    if (!payload || typeof payload !== "object") return null;
    const { v, t, s } = payload as SharePayload;
    if (v !== 1 || typeof t !== "number" || !Array.isArray(s)) return null;
    const refs: SharedSectionRef[] = [];
    for (const entry of s) {
      if (
        !Array.isArray(entry) ||
        entry.length !== 3 ||
        entry.some((part) => typeof part !== "string")
      ) {
        return null;
      }
      refs.push({ courseCode: entry[0], section: entry[1], type: entry[2] });
    }
    return { termId: t, refs };
  } catch {
    return null;
  }
}
