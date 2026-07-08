import type { Term } from "@lib/types";

export function termChipLabel(term: Pick<Term, "label" | "semester">) {
  if (term.semester === "midyear") return "Midyear";
  if (term.semester === "1") return "1st sem";
  if (term.semester === "2") return "2nd sem";
  return term.label.replace(/^AY \d{4}-\d{4} /, "");
}

/** "1st sem AY 2026 - 2027" — semester plus academic year for the term picker. */
export function termFullLabel(
  term: Pick<Term, "label" | "semester" | "schoolYear">,
) {
  const semester = termChipLabel(term);
  if (!term.schoolYear) return semester;
  const ay = `AY ${term.schoolYear.replace("-", " - ")}`;
  return `${semester} ${ay}`;
}

export function termSeoPhrase(term: Pick<Term, "label">) {
  return term.label;
}
