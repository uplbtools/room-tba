export function fieldSaveActionLabel(options: {
  canPublish: boolean;
  isSaving: boolean;
}): string {
  if (options.isSaving) {
    return options.canPublish ? "Saving..." : "Submitting...";
  }
  return options.canPublish ? "Save" : "Submit";
}

export function editorToggleLabel(options: {
  expanded: boolean;
  canPublish: boolean;
  publishOpenLabel: string;
  closeLabel?: string;
  suggestOpenLabel?: string;
}): string {
  if (options.expanded) {
    return options.closeLabel ?? "Close";
  }
  return options.canPublish
    ? options.publishOpenLabel
    : (options.suggestOpenLabel ?? "Suggest an edit");
}

export function proposalStatusMessage(status: string): string {
  switch (status) {
    case "pending":
      return "Status: pending. Waiting for editor review.";
    case "needs_changes":
      return "Status: needs changes. Update your suggestion below or withdraw it.";
    case "withdrawn":
      return "You withdrew this suggestion.";
    default:
      return `Status: ${status.replaceAll("_", " ")}.`;
  }
}

export function canShowWithdrawProposal(
  status: string | null | undefined,
): boolean {
  return status === "pending" || status === "needs_changes";
}

export function entityEditorSavedMessage(options: {
  canPublish: boolean;
  savedFieldLabel?: string;
}): string {
  if (options.canPublish && options.savedFieldLabel) {
    return `${options.savedFieldLabel} saved.`;
  }
  return "Suggestion submitted.";
}
