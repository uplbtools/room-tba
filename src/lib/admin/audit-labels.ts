/** Human labels for audit log actions (pure; shared by UI and tests). */
const LABELS: Record<string, string> = {
  "login.success": "Signed in",
  "login.failure": "Failed sign-in",
  "login.mfa_failure": "Wrong two-step code",
  "user.created": "Account created",
  "user.invited": "Invite sent",
  "user.invite_accepted": "Invite accepted",
  "user.role_changed": "Role changed",
  "user.activated": "Account reactivated",
  "user.deactivated": "Account deactivated",
  "password.reset_requested": "Password reset requested",
  "password.reset_completed": "Password reset",
  "password.changed": "Password changed",
  "mfa.enabled": "Two-step verification on",
  "mfa.disabled": "Two-step verification off",
  "mfa.recovery_code_used": "Recovery code used",
  "proposal.approved": "Suggestion approved",
  "proposal.rejected": "Suggestion rejected",
  "proposal.changes_requested": "Changes requested",
  "access.requested": "Editor access requested",
  "access.approved": "Editor access granted",
  "access.declined": "Editor access declined",
};

export function auditActionLabel(action: string): string {
  return LABELS[action] ?? action;
}
