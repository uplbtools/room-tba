import { describe, expect, test } from "vitest";
import { expectSingleLineButton, mountAtWidth } from "@test/layout-assertions";

describe("map chrome layout helpers", () => {
  test("expectSingleLineButton passes for nowrap single-line button", () => {
    mountAtWidth(320);
    const btn = document.createElement("button");
    btn.style.whiteSpace = "nowrap";
    btn.style.lineHeight = "16px";
    btn.style.height = "16px";
    btn.textContent = "Share";
    document.body.appendChild(btn);
    expectSingleLineButton(btn);
  });

  test("expectNoHorizontalOverflow on fixed container", () => {
    mountAtWidth(320);
    document.body.innerHTML =
      '<div style="width:320px;overflow:hidden"><span style="white-space:nowrap">Short</span></div>';
    const el = document.querySelector("div")!;
    expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth + 1);
  });
});
