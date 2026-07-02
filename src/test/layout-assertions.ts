import { expect } from "vitest";

export function expectSingleLineButton(el: HTMLElement) {
  const style = getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight) || 16;
  expect(el.scrollHeight).toBeLessThanOrEqual(lineHeight * 1.35);
}

export function expectNoHorizontalOverflow(container: HTMLElement) {
  expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth + 1);
}

export function expectMinTouchTarget(el: HTMLElement, minPx = 44) {
  const rect = el.getBoundingClientRect();
  expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(minPx - 1);
}

export function mountAtWidth(widthPx: number) {
  document.body.style.width = `${widthPx}px`;
  document.body.style.margin = "0";
}
