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
  return `Status: ${status.replace("_", " ")}. Waiting for editor review.`;
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
