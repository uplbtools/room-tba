import type { NotificationAdapter } from "./adapter";
import type { NotificationEvent } from "./types";

/** A hung gateway must not hold a function open; the outbox retries later. */
export const GATEWAY_TIMEOUT_MS = 8000;

export class HttpNotificationAdapter implements NotificationAdapter {
  constructor(
    private readonly gatewayUrl: string,
    private readonly secret: string,
    private readonly timeoutMs = GATEWAY_TIMEOUT_MS,
  ) {}

  async notify(event: NotificationEvent): Promise<void> {
    const res = await fetch(this.gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-notification-secret": this.secret,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      throw new Error(
        `Notification gateway ${res.status}: ${await res.text()}`,
      );
    }
  }
}
