import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import StatusBarLinkGroups from "@ui/status-bar/StatusBarLinkGroups.svelte";
import { STATUS_BAR_COMMUNITY_GROUP } from "@constants/status-bar-links";
import { mountAtWidth } from "@test/layout-assertions";

describe("StatusBarLinkGroups", () => {
  test("community links stay on one row at 320px", () => {
    mountAtWidth(320);
    const { container } = render(StatusBarLinkGroups, {
      props: {
        groups: [STATUS_BAR_COMMUNITY_GROUP],
        onAction: () => {},
      },
    });
    const group = container.querySelector(
      ".status-bar__nav-group",
    ) as HTMLElement;
    expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth + 4);
    expect(screen.getByRole("link", { name: /UPLB Tools/i })).toBeVisible();
  });
});
