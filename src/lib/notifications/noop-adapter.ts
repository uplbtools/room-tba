import type { NotificationAdapter } from "./adapter";
import type { NotificationEvent } from "./types";

export class NoOpNotificationAdapter implements NotificationAdapter {
  async notify(_event: NotificationEvent): Promise<void> {
    // Local dev / tests — no gateway configured
  }
}
