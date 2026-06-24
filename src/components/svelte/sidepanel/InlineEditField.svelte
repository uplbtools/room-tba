<script lang="ts">
  type FieldInputType =
    | "text"
    | "textarea"
    | "select"
    | "number"
    | "checkbox"
    | "list";
  type FieldValue = string | number | boolean | string[] | null;
  type FieldOption = {
    label: string;
    value: string;
  };

  type Props = {
    label: string;
    value: FieldValue;
    inputType?: FieldInputType;
    options?: FieldOption[];
    placeholder?: string;
    help?: string;
    rows?: number;
    nullable?: boolean;
    trim?: boolean;
    onSave: (value: FieldValue) => Promise<void>;
  };

  let {
    label,
    value,
    inputType = "text",
    options = [],
    placeholder = "",
    help,
    rows = 3,
    nullable = false,
    trim = true,
    onSave,
  }: Props = $props();

  let draft = $state("");
  let checkedDraft = $state(false);
  let saving = $state(false);
  let status = $state<string | null>(null);
  let error = $state<string | null>(null);
  let lastValueKey = $state("");

  const valueKey = $derived(JSON.stringify(value ?? null));
  const dirty = $derived(
    inputType === "checkbox"
      ? checkedDraft !== Boolean(value)
      : draft !== formatDraft(value),
  );

  $effect(() => {
    if (valueKey === lastValueKey) return;
    draft = formatDraft(value);
    checkedDraft = Boolean(value);
    lastValueKey = valueKey;
  });

  function formatDraft(rawValue: FieldValue): string {
    if (Array.isArray(rawValue)) return rawValue.join("\n");
    if (rawValue === null || rawValue === undefined) return "";
    return String(rawValue);
  }

  function parseDraft(): FieldValue {
    if (inputType === "checkbox") return checkedDraft;

    const rawDraft = String(draft);
    const normalizedDraft = trim ? rawDraft.trim() : rawDraft;
    if (inputType === "number") {
      if (normalizedDraft === "") return nullable ? null : 0;
      return Number(normalizedDraft);
    }

    if (inputType === "list") {
      return normalizedDraft
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (nullable && normalizedDraft === "") return null;
    return trim ? normalizedDraft : draft;
  }

  async function saveField() {
    const nextValue = parseDraft();
    if (
      inputType === "number" &&
      typeof nextValue === "number" &&
      !Number.isFinite(nextValue)
    ) {
      error = `${label} must be a valid number.`;
      status = null;
      return;
    }

    saving = true;
    error = null;
    status = null;
    try {
      await onSave(nextValue);
      status = "Saved";
      setTimeout(() => {
        if (status === "Saved") status = null;
      }, 1800);
    } catch (err) {
      error = err instanceof Error ? err.message : `${label} failed to save.`;
    } finally {
      saving = false;
    }
  }

  function resetDraft() {
    draft = formatDraft(value);
    checkedDraft = Boolean(value);
    error = null;
    status = null;
  }
</script>

<div class="inline-edit-field">
  <label>
    <span class="field-label">{label}</span>
    {#if inputType === "textarea"}
      <textarea bind:value={draft} {placeholder} {rows} disabled={saving}
      ></textarea>
    {:else if inputType === "select"}
      <select bind:value={draft} disabled={saving}>
        {#each options as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {:else if inputType === "checkbox"}
      <span class="checkbox-row">
        <input type="checkbox" bind:checked={checkedDraft} disabled={saving} />
        <span>{checkedDraft ? "Yes" : "No"}</span>
      </span>
    {:else if inputType === "number"}
      <input inputmode="decimal" bind:value={draft} {placeholder} disabled={saving} />
    {:else}
      <input bind:value={draft} {placeholder} disabled={saving} />
    {/if}
  </label>

  {#if help}
    <p class="field-help">{help}</p>
  {/if}

  <div class="field-actions">
    <button class="save-btn" disabled={!dirty || saving} onclick={saveField}>
      {saving ? "Saving" : "Save"}
    </button>
    {#if dirty}
      <button class="reset-btn" disabled={saving} onclick={resetDraft}
        >Reset</button
      >
    {/if}
    {#if status}
      <span class="field-status">{status}</span>
    {/if}
  </div>

  {#if error}
    <p class="field-error">{error}</p>
  {/if}
</div>

<style>
  .inline-edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem;
    border: 1px solid hsl(0, 0%, 90%);
    border-radius: 0.5rem;
    background: hsl(0, 0%, 99%);
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field-label {
    color: #555;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid hsl(0, 0%, 84%);
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    background: white;
    color: #222;
    font: inherit;
    font-size: 0.8125rem;
  }

  textarea {
    min-height: 4.75rem;
    resize: vertical;
  }

  .checkbox-row {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: #333;
    font-size: 0.8125rem;
  }

  .checkbox-row input {
    width: auto;
  }

  .field-help,
  .field-error {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.35;
  }

  .field-help {
    color: #777;
  }

  .field-error {
    color: hsl(5, 70%, 38%);
  }

  .field-actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 1.75rem;
  }

  .save-btn,
  .reset-btn {
    border: 0;
    border-radius: 0.375rem;
    padding: 0.25rem 0.55rem;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }

  .save-btn {
    background: #7b1113;
    color: white;
  }

  .save-btn:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .reset-btn {
    background: hsl(0, 0%, 92%);
    color: #444;
  }

  .field-status {
    color: hsl(160, 84%, 26%);
    font-size: 0.75rem;
    font-weight: 700;
  }
</style>
