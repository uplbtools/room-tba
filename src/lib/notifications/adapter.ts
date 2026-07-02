import type { NotificationEvent } from "./types";

export interface NotificationAdapter {
  notify(event: NotificationEvent): Promise<void>;
}
