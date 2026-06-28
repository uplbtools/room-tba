<script lang="ts">
  import type { DormData } from "../../../lib/types";
  import EntityEditorPanel from "../editor/EntityEditorPanel.svelte";
  import EntityEditorField from "../editor/EntityEditorField.svelte";
  import EntityEditorCheckboxField from "../editor/EntityEditorCheckboxField.svelte";
  import { entityEditorSavedMessage } from "../../../lib/editor/field-action-label";
  import { adminAuthStore, mapEditStore, mapProposalStore } from "../../../lib/store.svelte";
  import "../editor/entity-editor.css";

  type DormEditableField =
    | "dormName"
    | "shortName"
    | "description"
    | "gender"
    | "isUpManaged"
    | "capacity"
    | "priceRange"
    | "managingOffice"
    | "contactEmail"
    | "contactPhone"
    | "amenities"
    | "facebookLink"
    | "osmLink";

  type Props = {
    dorm: DormData;
    canPublish: boolean;
    savingField: DormEditableField | null;
    savedField: DormEditableField | null;
    fieldError: string | null;
    proposalStatus: string | null;
    submitterNameDraft?: string;
    nameDraft: string;
    shortNameDraft: string;
    descriptionDraft: string;
    genderDraft: string;
    isUpManagedDraft: boolean;
    capacityDraft: string;
    priceRangeDraft: string;
    managingOfficeDraft: string;
    contactEmailDraft: string;
    contactPhoneDraft: string;
    amenitiesDraft: string;
    facebookLinkDraft: string;
    osmLinkDraft: string;
    fieldLabel: (field: DormEditableField) => string;
    fieldIsUnchanged: (field: DormEditableField, current: DormData) => boolean;
    saveField: (field: DormEditableField) => void;
    enablePinProposal: () => void;
  };

  let {
    dorm,
    canPublish,
    savingField,
    savedField,
    fieldError,
    proposalStatus,
    submitterNameDraft = $bindable(""),
    nameDraft = $bindable(""),
    shortNameDraft = $bindable(""),
    descriptionDraft = $bindable(""),
    genderDraft = $bindable(""),
    isUpManagedDraft = $bindable(false),
    capacityDraft = $bindable(""),
    priceRangeDraft = $bindable(""),
    managingOfficeDraft = $bindable(""),
    contactEmailDraft = $bindable(""),
    contactPhoneDraft = $bindable(""),
    amenitiesDraft = $bindable(""),
    facebookLinkDraft = $bindable(""),
    osmLinkDraft = $bindable(""),
    fieldLabel,
    fieldIsUnchanged,
    saveField,
    enablePinProposal,
  }: Props = $props();

  const disabled = $derived(savingField !== null);
</script>

<EntityEditorPanel
  {canPublish}
  showSubmitterName={!canPublish && !adminAuthStore.isLoggedIn}
  submitterNameId="dorm-submitter-name"
  bind:submitterName={submitterNameDraft}
  {proposalStatus}
  successMessage={savedField
    ? entityEditorSavedMessage({
        canPublish,
        savedFieldLabel: fieldLabel(savedField),
      })
    : null}
  errorMessage={fieldError}
>
  <EntityEditorField
    label="Dorm name"
    inputId="dorm-name-editor"
    {canPublish}
    {disabled}
    fieldSaving={savingField === "dormName"}
    unchanged={fieldIsUnchanged("dormName", dorm)}
    onsave={() => saveField("dormName")}
  >
    {#snippet control()}
      <input
        id="dorm-name-editor"
        bind:value={nameDraft}
        {disabled}
        autocomplete="off"
      />
    {/snippet}
  </EntityEditorField>

  <EntityEditorField
    label="Short name"
    inputId="dorm-short-name-editor"
    {canPublish}
    {disabled}
    fieldSaving={savingField === "shortName"}
    unchanged={fieldIsUnchanged("shortName", dorm)}
    onsave={() => saveField("shortName")}
  >
    {#snippet control()}
      <input
        id="dorm-short-name-editor"
        bind:value={shortNameDraft}
        {disabled}
        autocomplete="off"
      />
    {/snippet}
  </EntityEditorField>

  <EntityEditorField
    label="Description"
    inputId="dorm-description-editor"
    {canPublish}
    {disabled}
    stacked
    fieldSaving={savingField === "description"}
    unchanged={fieldIsUnchanged("description", dorm)}
    onsave={() => saveField("description")}
  >
    {#snippet control()}
      <textarea
        id="dorm-description-editor"
        bind:value={descriptionDraft}
        {disabled}
        rows="3"
      ></textarea>
    {/snippet}
  </EntityEditorField>

  <div class="editor-grid">
    <EntityEditorField
      label="Gender policy"
      inputId="dorm-gender-editor"
      {canPublish}
      {disabled}
      fieldSaving={savingField === "gender"}
      unchanged={fieldIsUnchanged("gender", dorm)}
      onsave={() => saveField("gender")}
    >
      {#snippet control()}
        <select id="dorm-gender-editor" bind:value={genderDraft} {disabled}>
          <option value="male">Male-exclusive</option>
          <option value="female">Female-exclusive</option>
          <option value="coed">Co-ed</option>
          <option value="Mixed">Mixed</option>
        </select>
      {/snippet}
    </EntityEditorField>

    <EntityEditorField
      label="Capacity (beds)"
      inputId="dorm-capacity-editor"
      {canPublish}
      {disabled}
      fieldSaving={savingField === "capacity"}
      unchanged={fieldIsUnchanged("capacity", dorm)}
      onsave={() => saveField("capacity")}
    >
      {#snippet control()}
        <input
          id="dorm-capacity-editor"
          type="number"
          min="0"
          bind:value={capacityDraft}
          {disabled}
        />
      {/snippet}
    </EntityEditorField>
  </div>

  <EntityEditorCheckboxField
    label="UP-managed dorm"
    inputId="dorm-up-managed-editor"
    {canPublish}
    bind:checked={isUpManagedDraft}
    {disabled}
    fieldSaving={savingField === "isUpManaged"}
    unchanged={fieldIsUnchanged("isUpManaged", dorm)}
    onsave={() => saveField("isUpManaged")}
  />

  <EntityEditorField
    label="Price range"
    inputId="dorm-price-editor"
    {canPublish}
    {disabled}
    fieldSaving={savingField === "priceRange"}
    unchanged={fieldIsUnchanged("priceRange", dorm)}
    onsave={() => saveField("priceRange")}
  >
    {#snippet control()}
      <input id="dorm-price-editor" bind:value={priceRangeDraft} {disabled} />
    {/snippet}
  </EntityEditorField>

  <EntityEditorField
    label="Managing office"
    inputId="dorm-office-editor"
    {canPublish}
    {disabled}
    fieldSaving={savingField === "managingOffice"}
    unchanged={fieldIsUnchanged("managingOffice", dorm)}
    onsave={() => saveField("managingOffice")}
  >
    {#snippet control()}
      <input
        id="dorm-office-editor"
        bind:value={managingOfficeDraft}
        {disabled}
      />
    {/snippet}
  </EntityEditorField>

  <EntityEditorField
    label="Contact email"
    inputId="dorm-email-editor"
    {canPublish}
    {disabled}
    fieldSaving={savingField === "contactEmail"}
    unchanged={fieldIsUnchanged("contactEmail", dorm)}
    onsave={() => saveField("contactEmail")}
  >
    {#snippet control()}
      <input
        id="dorm-email-editor"
        type="email"
        bind:value={contactEmailDraft}
        {disabled}
      />
    {/snippet}
  </EntityEditorField>

  <EntityEditorField
    label="Contact phones"
    inputId="dorm-phone-editor"
    {canPublish}
    {disabled}
    stacked
    fieldSaving={savingField === "contactPhone"}
    unchanged={fieldIsUnchanged("contactPhone", dorm)}
    onsave={() => saveField("contactPhone")}
  >
    {#snippet control()}
      <textarea
        id="dorm-phone-editor"
        bind:value={contactPhoneDraft}
        {disabled}
        rows="3"
        placeholder="One phone number per line"
      ></textarea>
    {/snippet}
  </EntityEditorField>

  <EntityEditorField
    label="Amenities"
    inputId="dorm-amenities-editor"
    {canPublish}
    {disabled}
    stacked
    fieldSaving={savingField === "amenities"}
    unchanged={fieldIsUnchanged("amenities", dorm)}
    onsave={() => saveField("amenities")}
  >
    {#snippet control()}
      <textarea
        id="dorm-amenities-editor"
        bind:value={amenitiesDraft}
        {disabled}
        rows="4"
        placeholder="One amenity per line"
      ></textarea>
    {/snippet}
  </EntityEditorField>

  <EntityEditorField
    label="Facebook link"
    inputId="dorm-facebook-editor"
    {canPublish}
    {disabled}
    fieldSaving={savingField === "facebookLink"}
    unchanged={fieldIsUnchanged("facebookLink", dorm)}
    onsave={() => saveField("facebookLink")}
  >
    {#snippet control()}
      <input
        id="dorm-facebook-editor"
        type="url"
        bind:value={facebookLinkDraft}
        {disabled}
      />
    {/snippet}
  </EntityEditorField>

  <EntityEditorField
    label="OpenStreetMap link"
    inputId="dorm-osm-editor"
    {canPublish}
    {disabled}
    fieldSaving={savingField === "osmLink"}
    unchanged={fieldIsUnchanged("osmLink", dorm)}
    onsave={() => saveField("osmLink")}
  >
    {#snippet control()}
      <input
        id="dorm-osm-editor"
        type="url"
        bind:value={osmLinkDraft}
        {disabled}
      />
    {/snippet}
  </EntityEditorField>

  <p class="editor-note">
    {#if canPublish}
      {#if mapEditStore.enabled}
        Map editing is on — drag this dorm's pin on the map to move it.
      {:else}
        To move this dorm's map pin,
        <button
          type="button"
          class="inline-link-btn"
          onclick={() => mapEditStore.enable()}
        >
          enable map editing
        </button>
        from the shield control, then drag its marker.
      {/if}
    {:else if dorm.lat && dorm.lon}
      {#if mapProposalStore.allowsKey(`dorm:${dorm.id}`)}
        Pin move mode is on — drag this dorm's marker on the map.
      {:else}
        To suggest a map pin move,
        <button
          type="button"
          class="inline-link-btn"
          onclick={enablePinProposal}
        >
          enable pin move
        </button>
        , then drag its marker.
      {/if}
    {/if}
  </p>
</EntityEditorPanel>
