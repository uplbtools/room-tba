export type AdminRole = "admin" | "editor" | "contributor";

export function canPublishDirectly(role: AdminRole): boolean {
  return role === "admin" || role === "editor";
}

export function canReviewProposals(role: AdminRole): boolean {
  return role === "admin" || role === "editor";
}
