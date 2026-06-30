import { describe, expect, it } from "bun:test";
import { shouldAutoOpenLandingModal } from "./landing-modal-auto-open";

describe("shouldAutoOpenLandingModal", () => {
  const ready = {
    consumed: false,
    phase: "ready",
    suppressLandingModal: false,
    hideLandingModal: false,
    modalOpen: false,
  };

  it("opens once when bootstrap is ready", () => {
    expect(shouldAutoOpenLandingModal(ready)).toBe(true);
  });

  it("does not reopen after the auto-open slot was consumed", () => {
    expect(shouldAutoOpenLandingModal({ ...ready, consumed: true })).toBe(
      false,
    );
  });

  it("does not reopen when the user closes the modal", () => {
    expect(
      shouldAutoOpenLandingModal({
        ...ready,
        consumed: true,
        modalOpen: false,
      }),
    ).toBe(false);
  });

  it("respects hideLandingModal", () => {
    expect(
      shouldAutoOpenLandingModal({ ...ready, hideLandingModal: true }),
    ).toBe(false);
  });
});
