import type { NotificationAdapter } from "./adapter";
import type { NotificationEvent } from "./types";

export class HttpNotificationAdapter implements NotificationAdapter {
  constructor(
    private readonly gatewayUrl: string,
    private readonly secret: string,
  ) {}

  async notify(event: NotificationEvent): Promise<void> {
    const res = await fetch(this.gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-notification-secret": this.secret,
      },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      throw new Error(
        `Notification gateway ${res.status}: ${await res.text()}`,
      );
    }
  }
}
