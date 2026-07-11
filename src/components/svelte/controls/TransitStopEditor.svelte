<script lang="ts">
  import type { JeepneyStop } from "@constants/jeepney-routes";
  import {
    additionProposalStore,
    adminAuthStore,
    sidePanelStore,
    transitStore,
  } from "@lib/store.svelte";
  import {
    persistEntityChange,
    publishEntityCreate,
    resolveSubmitterName,
    submitEntityProposal,
  } from "@lib/proposals/client";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorPanel from "@ui/editor/EntityEditorPanel.svelte";
  import EntityEditorPinRow from "@ui/editor/EntityEditorPinRow.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";

  type Props = {
    routeId: string;
    routeName: string;
    stop?: JeepneyStop;
    onRemoved?: () => void;
  };

  let { routeId, routeName, stop, onRemoved }: Props = $props();
  const isNew = $derived(stop === undefined);
  const canPublish = $derived(adminAuthStore.canPublish);
  const canEdit = $derived(isNew || (stop?.id !== undefined && stop.version !== undefined));

  let expanded = $state(false);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let success = $state<string | null>(null);
  let submitterName = $state("");
  let proposalStatus = $state<string | null>(null);
  let activeProposalId = $state<number | null>(null);
  let name = $state(stop?.name ?? "");
  let description = $state(stop?.description ?? "");
  let pin = $state<{ lat: number; lon: number } | null>(
    stop ? { lat: stop.lat, lon: stop.lon } : null,
  );
  let picking = $state(false);

  async function pickOnMap() {
    error = null;
    picking = true;
    // Same pin-drop flow as adding a building: collapse the panel so the map
    // is tappable, wait for the click, then restore.
    sidePanelStore.collapse();
    try {
      pin = await additionProposalStore.requestMapPin();
    } catch {
      // cancelled
    } finally {
      additionProposalStore.clearDraftPin();
      sidePanelStore.expand();
      picking = false;
    }
  }

  function buildPatch() {
    return {
      ...(isNew ? { routeId } : {}),
      name: name.trim(),
      description: description.trim(),
      lat: pin?.lat ?? Number.NaN,
      lon: pin?.lon ?? Number.NaN,
    };
  }

  function validate() {
    const patch = buildPatch();
    if (!patch.name || !patch.description) {
      error = "Stop name and description are required.";
      return null;
    }
    if (!pin) {
      error = "Drop a pin on the map to mark the stop.";
      return null;
    }
    return patch;
  }

  async function save() {
    const patch = validate();
    if (!patch) return;
    error = null;
    success = null;
    submitting = true;
    try {
      if (isNew) {
        if (canPublish) {
          const result = await publishEntityCreate("create_jeepney_stop", patch);
          if (!result.ok) {
            error = result.error ?? "Could not add stop.";
            return;
          }
          await transitStore.refresh();
          name = "";
          description = "";
          success = "Stop added.";
          pin = null;
          return;
        }
        const result = await submitEntityProposal({
          entityType: "create_jeepney_stop",
          entityId: 0,
          baseVersion: 0,
          patch,
          submitterName: resolveSubmitterName({
            displayName: adminAuthStore.displayName,
            username: adminAuthStore.username,
            draftName: submitterName,
          }),
          proposalId: activeProposalId,
        });
        if (!result.ok) {
          error = result.error ?? "Could not submit stop suggestion.";
          return;
        }
        activeProposalId = result.proposal?.id ?? null;
        proposalStatus = result.proposal?.status ?? "pending";
        success = "Stop suggestion submitted.";
        return;
      }

      if (stop?.id === undefined || stop.version === undefined) return;
      const result = await persistEntityChange({
        entityType: "jeepney_stop",
        entityId: stop.id,
        baseVersion: stop.version,
        patch,
        entityLabel: `${stop.name} stop`,
        canPublish,
        submitterName: resolveSubmitterName({
          displayName: adminAuthStore.displayName,
          username: adminAuthStore.username,
          draftName: submitterName,
        }),
        proposalId: activeProposalId,
      });
      if (!result.ok) {
        error = result.error ?? "Could not save stop.";
        return;
      }
      if (canPublish) await transitStore.refresh();
      activeProposalId = result.proposal?.id ?? null;
      proposalStatus = result.proposal?.status ?? null;
      success = canPublish ? "Stop saved." : "Stop suggestion submitted.";
    } finally {
      submitting = false;
    }
  }

  async function remove() {
    if (!stop?.id || stop.version === undefined) return;
    if (!window.confirm(`Remove ${stop.name} from ${routeName}?`)) return;
    submitting = true;
    error = null;
    success = null;
    try {
      const result = await persistEntityChange({
        entityType: "jeepney_stop",
        entityId: stop.id,
        baseVersion: stop.version,
        patch: { isActive: false },
        entityLabel: `${stop.name} stop`,
        canPublish,
        submitterName: resolveSubmitterName({
          displayName: adminAuthStore.displayName,
          username: adminAuthStore.username,
          draftName: submitterName,
        }),
      });
      if (!result.ok) {
        error = result.error ?? "Could not remove stop.";
        return;
      }
      if (canPublish) {
        await transitStore.refresh();
        onRemoved?.();
      }
      success = canPublish ? "Stop removed." : "Removal suggested.";
    } finally {
      submitting = false;
    }
  }
</script>

{#if canEdit}
  <section class="transit-stop-editor">
    <EntityEditorToggle
      expanded={expanded}
      {canPublish}
      publishOpenLabel={isNew ? "Add stop" : "Edit stop"}
      suggestOpenLabel={isNew ? "Suggest a stop" : "Suggest an edit"}
      onclick={() => (expanded = !expanded)}
    />

    {#if expanded}
      <EntityEditorPanel
        {canPublish}
        showSubmitterName={!canPublish && !adminAuthStore.isLoggedIn}
        submitterNameId={isNew ? `new-stop-${routeId}` : `stop-${stop?.id}`}
        bind:submitterName
        {proposalStatus}
        {activeProposalId}
        onWithdrawn={() => {
          activeProposalId = null;
          proposalStatus = null;
        }}
        onsubmit={save}
        {submitting}
        submitDisabled={false}
        successMessage={success}
        errorMessage={error}
        historyEntity={stop?.id && stop.version
          ? { entityType: "jeepney_stop", entityId: stop.id, version: stop.version }
          : null}
      >
        <EntityEditorFormField label="Stop name" inputId={`stop-name-${stop?.id ?? routeId}`}>
          {#snippet control()}
            <input id={`stop-name-${stop?.id ?? routeId}`} bind:value={name} disabled={submitting} />
          {/snippet}
        </EntityEditorFormField>
        <EntityEditorFormField label="Description" inputId={`stop-description-${stop?.id ?? routeId}`}>
          {#snippet control()}
            <textarea id={`stop-description-${stop?.id ?? routeId}`} bind:value={description} rows="3" disabled={submitting}></textarea>
          {/snippet}
        </EntityEditorFormField>
        <EntityEditorPinRow
          label={pin
            ? `Pin set · ${pin.lat.toFixed(5)}, ${pin.lon.toFixed(5)}`
            : "Drop a pin on the map"}
          pickLabel={pin ? "Move pin" : "Pick on map"}
          disabled={submitting || picking}
          onclick={pickOnMap}
        />
        {#if canPublish}
          <EntityEditorSubmitButton
            label={isNew ? "Add stop" : "Save stop"}
            savingLabel={isNew ? "Adding…" : "Saving…"}
            saving={submitting}
            onclick={save}
          />
        {/if}
        {#if !isNew}
          <EntityEditorSubmitButton
            label={canPublish ? "Remove stop" : "Suggest removal"}
            savingLabel="Saving…"
            saving={submitting}
            variant="danger"
            onclick={remove}
          />
        {/if}
      </EntityEditorPanel>
    {/if}
  </section>
{/if}

<style>
  .transit-stop-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.25rem;
  }

</style>
