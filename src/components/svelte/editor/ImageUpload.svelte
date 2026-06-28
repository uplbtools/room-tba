<script lang="ts">
  import "./entity-editor.css";
  import { UPLOAD_MAX_BYTES } from "@lib/r2-upload-core";

  type Props = {
    value?: string | null;
    prefix?: string;
    disabled?: boolean;
    inputId?: string;
    label?: string;
  };

  let {
    value = $bindable(null),
    prefix = "uploads",
    disabled = false,
    inputId = "image-upload-input",
    label = "Event image",
  }: Props = $props();

  let uploading = $state(false);
  let error = $state<string | null>(null);
  let uploadConfigured = $state<boolean | null>(null);

  const maxSizeLabel = `${Math.round(UPLOAD_MAX_BYTES / (1024 * 1024))} MB`;

  $effect(() => {
    let cancelled = false;
    uploadConfigured = null;
    fetch("/api/admin/upload", { credentials: "same-origin" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          uploadConfigured = false;
          return;
        }
        const data = (await res.json().catch(() => ({}))) as {
          configured?: boolean;
        };
        uploadConfigured = data.configured === true;
      })
      .catch(() => {
        if (!cancelled) uploadConfigured = false;
      });
    return () => {
      cancelled = true;
    };
  });

  async function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || uploading || disabled) return;

    if (file.size > UPLOAD_MAX_BYTES) {
      error = `Image must be ${maxSizeLabel} or smaller.`;
      return;
    }

    uploading = true;
    error = null;
    try {
      const formData = new FormData();
      formData.set("file", file);
      if (prefix) formData.set("prefix", prefix);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (res.status === 429) {
        throw new Error(
          data.error ?? "Too many uploads. Wait a few minutes and try again.",
        );
      }
      if (res.status === 503) {
        uploadConfigured = false;
        throw new Error(
          data.error ?? "Image uploads are not configured on this server yet.",
        );
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }

      value = data.url;
      uploadConfigured = true;
    } catch (uploadError) {
      error =
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image";
    } finally {
      uploading = false;
    }
  }

  function clearImage() {
    value = null;
    error = null;
  }

  const inputDisabled = $derived(
    disabled || uploading || uploadConfigured === false,
  );
</script>

<div class="editor-field image-upload">
  <label for={inputId}>{label}</label>
  {#if value}
    <div class="image-upload-preview">
      <img src={value} alt="" loading="lazy" />
      <div class="image-upload-actions">
        <label class="editor-toggle image-upload-button" for={inputId}>
          {uploading ? "Uploading..." : "Replace"}
        </label>
        <button
          type="button"
          class="editor-toggle image-upload-button"
          disabled={inputDisabled}
          onclick={clearImage}
        >
          Remove
        </button>
      </div>
    </div>
  {:else}
    <label
      class="editor-toggle image-upload-button"
      class:disabled={inputDisabled}
      for={inputId}
    >
      {uploading ? "Uploading..." : "Choose image"}
    </label>
  {/if}
  <input
    id={inputId}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    hidden
    disabled={inputDisabled}
    onchange={handleFileChange}
  />
  <p class="entity-editor-muted image-upload-hint">
    {#if uploadConfigured === false}
      Image uploads are not configured on this server. You can still save the
      event without a photo.
    {:else}
      JPEG, PNG, or WebP up to {maxSizeLabel}.
    {/if}
  </p>
  {#if error}
    <p class="image-upload-error" role="alert">{error}</p>
  {/if}
</div>

<style>
  .image-upload-preview {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .image-upload-preview img {
    width: 100%;
    max-height: 10rem;
    object-fit: cover;
    border-radius: 0.5rem;
    border: 1px solid hsl(5, 53%, 88%);
    background: white;
  }

  .image-upload-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .image-upload-button {
    cursor: pointer;
  }

  .image-upload-button.disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .image-upload-hint {
    margin: 0;
  }

  .image-upload-error {
    margin: 0;
    color: #9a1b1b;
    font-size: 0.75rem;
  }
</style>
