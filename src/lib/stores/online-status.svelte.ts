/**
 * navigator.onLine as reactive state. Read at construction, so a reload while
 * offline starts offline instead of waiting for an "offline" event that never
 * fires.
 */
export class OnlineStatusStore {
  online = $state(true);

  constructor() {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }
    this.online = navigator.onLine;
    window.addEventListener("online", () => {
      this.online = true;
    });
    window.addEventListener("offline", () => {
      this.online = false;
    });
  }
}

export const onlineStatus = new OnlineStatusStore();
