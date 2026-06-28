import type { Term } from "@lib/types";

export function termChipLabel(term: Pick<Term, "label" | "semester">) {
  if (term.semester === "midyear") return "Midyear";
  if (term.semester === "1") return "1st sem";
  if (term.semester === "2") return "2nd sem";
  return term.label.replace(/^AY \d{4}-\d{4} /, "");
}

export function termSeoPhrase(term: Pick<Term, "label">) {
  return term.label;
}
