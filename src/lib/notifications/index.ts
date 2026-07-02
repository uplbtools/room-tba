import { NoOpNotificationAdapter } from "./noop-adapter";
import { HttpNotificationAdapter } from "./http-adapter";
import type { NotificationAdapter } from "./adapter";

let cached: NotificationAdapter | null = null;

export function getNotificationAdapter(): NotificationAdapter {
  if (cached) return cached;

  const url = process.env.NOTIFICATION_GATEWAY_URL?.trim();
  const secret = process.env.NOTIFICATION_INGRESS_SECRET?.trim();

  if (url && secret) {
    cached = new HttpNotificationAdapter(url, secret);
  } else {
    cached = new NoOpNotificationAdapter();
  }

  return cached;
}

export type { NotificationAdapter } from "./adapter";
export type { NotificationEvent, ProposalSubmittedPayload } from "./types";
export { NoOpNotificationAdapter } from "./noop-adapter";
export { HttpNotificationAdapter } from "./http-adapter";
