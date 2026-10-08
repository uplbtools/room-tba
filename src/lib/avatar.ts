/** Up to two uppercase initials from a display name ("Juan Dela Cruz" -> "JD"). */
export function nameInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w));
  if (words.length === 0) return "?";
  if (words.length === 1) {
    return (words[0]?.slice(0, 2) ?? "?").toUpperCase();
  }
  const first = words[0]?.[0] ?? "";
  const last = words[words.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

// Twelve hues 30 degrees apart, so neighbouring names land on clearly
// different colors instead of the near-identical hues a raw hash produced.
// Lightness 32% keeps white initials at 4.5:1 or better on every hue.
export const AVATAR_HUES = [
  5, 35, 65, 95, 125, 155, 185, 215, 245, 275, 305, 335,
];

/** FNV-1a: spreads similar strings ("Ana", "Ann") far apart. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministic background for a person. Pass a stable key (an account or
 * contributor key) when there is one, so a renamed person keeps one color.
 */
export function nameColor(name: string): string {
  const hue = AVATAR_HUES[hashString(name) % AVATAR_HUES.length];
  return `hsl(${hue}, 50%, 32%)`;
}
