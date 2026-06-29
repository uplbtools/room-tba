<script lang="ts">
  type Props = {
    entityKind: string;
    sourceLabel: string;
    candidateLabel: string;
    detail: string;
    merging?: boolean;
    disabled?: boolean;
    onconfirm: () => void;
    ondismiss: () => void;
  };

  const {
    entityKind,
    sourceLabel,
    candidateLabel,
    detail,
    merging = false,
    disabled = false,
    onconfirm,
    ondismiss,
  }: Props = $props();
</script>

<div class="entity-merge-prompt" role="status">
  <p>
    A {entityKind} named <strong>{candidateLabel}</strong> already exists.
    {detail}
    <strong>{sourceLabel}</strong> into it?
  </p>
  <div class="entity-merge-prompt__actions">
    <button
      type="button"
      class="entity-merge-prompt__btn entity-merge-prompt__btn--primary"
      disabled={merging || disabled}
      onclick={onconfirm}
    >
      {merging ? "Merging..." : `Merge into ${candidateLabel}`}
    </button>
    <button
      type="button"
      class="entity-merge-prompt__btn"
      disabled={merging}
      onclick={ondismiss}
    >
      Keep separate
    </button>
  </div>
</div>
