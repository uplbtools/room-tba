/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map(
    (i) => Number.parseInt(value.slice(i, i + 2), 16) / 255,
  );
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

/**
 * The route colour, darkened just enough that white text on it reaches
 * `target` (WCAG AA, 4.5:1). Forestry orange (#d97706) measured 3.19:1 under
 * the 11px badge and stop-number text. Non-hex input is returned unchanged.
 */
export function darkenForWhiteText(hex: string, target = 4.5): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const base = [0, 2, 4].map((i) =>
    Number.parseInt(hex.slice(1 + i, 3 + i), 16),
  );
  for (let step = 0; step <= 20; step += 1) {
    const factor = 1 - step * 0.04;
    const candidate = `#${base
      .map((c) =>
        Math.round(c * factor)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
    if (contrastWithWhite(candidate) >= target) return candidate;
  }
  return "#000000";
}
