import { describe, expect, test } from "bun:test";
import {
  editorToggleLabel,
  entityEditorSavedMessage,
  fieldSaveActionLabel,
  proposalStatusMessage,
} from "./field-action-label";

describe("fieldSaveActionLabel", () => {
  test("uses publish vs suggest wording", () => {
    expect(fieldSaveActionLabel({ canPublish: true, isSaving: false })).toBe(
      "Save",
    );
    expect(fieldSaveActionLabel({ canPublish: false, isSaving: false })).toBe(
      "Submit",
    );
    expect(fieldSaveActionLabel({ canPublish: true, isSaving: true })).toBe(
      "Saving...",
    );
    expect(fieldSaveActionLabel({ canPublish: false, isSaving: true })).toBe(
      "Submitting...",
    );
  });
});

describe("editorToggleLabel", () => {
  test("switches between open and close labels", () => {
    expect(
      editorToggleLabel({
        expanded: false,
        canPublish: true,
        publishOpenLabel: "Edit room",
      }),
    ).toBe("Edit room");
    expect(
      editorToggleLabel({
        expanded: true,
        canPublish: true,
        publishOpenLabel: "Edit room",
        closeLabel: "Close editor",
      }),
    ).toBe("Close editor");
  });
});

describe("proposalStatusMessage", () => {
  test("formats pending statuses", () => {
    expect(proposalStatusMessage("needs_changes")).toBe(
      "Status: needs changes — waiting for editor review.",
    );
  });
});

describe("entityEditorSavedMessage", () => {
  test("names saved fields for publishers", () => {
    expect(
      entityEditorSavedMessage({
        canPublish: true,
        savedFieldLabel: "Building name",
      }),
    ).toBe("Building name saved.");
    expect(
      entityEditorSavedMessage({ canPublish: false, savedFieldLabel: "Name" }),
    ).toBe("Suggestion submitted.");
  });
});
