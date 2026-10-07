export type LandingModalAutoOpenInput = {
  /** Set after the one-time bootstrap auto-open has run. */
  consumed: boolean;
  phase: string;
  suppressLandingModal: boolean;
  hideLandingModal: boolean;
  modalOpen: boolean;
};

/**
 * Whether the first-run tip card should show, once per browser (#302). It
 * replaced the auto-opening welcome modal; the full tour stays in the menu.
 *
 * Shows as soon as the app is interactive rather than waiting for phase
 * "ready": on slow networks "ready" lands 5-10s after first paint. Only the
 * error phase blocks it (the error overlay owns the screen then).
 */
export function shouldAutoOpenLandingModal(
  input: LandingModalAutoOpenInput,
): boolean {
  if (input.consumed) return false;
  if (input.phase === "error") return false;
  if (input.suppressLandingModal) return false;
  if (input.hideLandingModal) return false;
  if (input.modalOpen) return false;
  return true;
}
