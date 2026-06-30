export type LandingModalAutoOpenInput = {
  /** Set after the one-time bootstrap auto-open has run. */
  consumed: boolean;
  phase: string;
  suppressLandingModal: boolean;
  hideLandingModal: boolean;
  modalOpen: boolean;
};

/** Whether the welcome modal should auto-open once after bootstrap (#302). */
export function shouldAutoOpenLandingModal(
  input: LandingModalAutoOpenInput,
): boolean {
  if (input.consumed) return false;
  if (input.phase !== "ready") return false;
  if (input.suppressLandingModal) return false;
  if (input.hideLandingModal) return false;
  if (input.modalOpen) return false;
  return true;
}
