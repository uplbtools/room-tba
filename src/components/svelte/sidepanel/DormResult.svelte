<script lang="ts">
  import {
    queryStore,
    locationStore,
    adminAuthStore,
    mapEditStore,
  } from "../../../lib/store.svelte";
  import { getAppData } from "../../../lib/context";
  import type { DormData } from "../../../lib/types";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import Users from "@lucide/svelte/icons/users";
  import Mail from "@lucide/svelte/icons/mail";
  import Phone from "@lucide/svelte/icons/phone";
  import Building2 from "@lucide/svelte/icons/building-2";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import CircleDollarSign from "@lucide/svelte/icons/circle-dollar-sign";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import InlineEditField from "./InlineEditField.svelte";
  import {
    ClientEditConflictError,
    patchAdminField,
  } from "../../../lib/admin/editor-client";

  const appData = getAppData();
  const { dorms } = $derived(appData());

  const dorm = $derived(
    dorms?.find((d) => d.dormName === queryStore.queryValue),
  );
  const editorEnabled = $derived(
    adminAuthStore.isAdmin && mapEditStore.enabled,
  );

  type DormEditableField =
    | "dormName"
    | "shortName"
    | "gender"
    | "capacity"
    | "managingOffice"
    | "contactEmail"
    | "amenities"
    | "osmLink"
    | "description"
    | "isUpManaged"
    | "priceRange"
    | "contactPhone"
    | "facebookLink";

  const dormFieldLabels = {
    dormName: "name",
    shortName: "short name",
    gender: "gender",
    capacity: "capacity",
    managingOffice: "managing office",
    contactEmail: "email",
    amenities: "amenities",
    osmLink: "OSM link",
    description: "description",
    isUpManaged: "UP-managed status",
    priceRange: "price range",
    contactPhone: "phone",
    facebookLink: "Facebook link",
  } satisfies Record<DormEditableField, string>;

  const genderOptions = [
    { label: "Co-ed", value: "coed" },
    { label: "Male-exclusive", value: "male" },
    { label: "Female-exclusive", value: "female" },
  ];

  const amenities = $derived<() => string[]>(() => {
    if (!dorm?.amenities) return [];
    try {
      return dorm?.amenities;
    } catch {
      return [];
    }
  });

  const genderLabel = $derived(
    dorm?.gender === "male"
      ? "Male-exclusive"
      : dorm?.gender === "female"
        ? "Female-exclusive"
        : "Co-ed",
  );

  const genderColor = $derived(
    dorm?.gender === "male"
      ? "hsl(210, 65%, 50%)"
      : dorm?.gender === "female"
        ? "hsl(330, 65%, 50%)"
        : "hsl(150, 55%, 40%)",
  );

  const googleMapsLink = $derived(
    dorm?.lat && dorm?.lon
      ? `https://www.google.com/maps?q=${dorm.lat},${dorm.lon}`
      : null,
  );

  /** Only show shortName when it's a real abbreviation, not just the first word */
  const showShortName = $derived(() => {
    if (!dorm || !dorm.shortName) return false;
    const first = dorm?.dormName.split(/\s+/)[0].toLowerCase();
    return dorm.shortName.toLowerCase() !== first;
  });

  function applyUpdatedDorm(updated: DormData) {
    const current = dorms?.find((d) => d.id === updated.id);
    if (current) Object.assign(current, updated);

    if (
      queryStore.category === "dorm" &&
      queryStore.type === "result" &&
      queryStore.queryValue !== updated.dormName
    ) {
      queryStore.hydrateQuery({
        category: "dorm",
        type: "result",
        value: updated.dormName,
      });
    }
  }

  function saveFailureMessage(
    entityName: string,
    fieldLabel: string,
    error: unknown,
  ) {
    const reason =
      error instanceof Error ? error.message : "Unknown save failure";
    return `${entityName} ${fieldLabel} failed to save: ${reason}`;
  }

  async function saveDormField(field: DormEditableField, value: unknown) {
    if (!dorm) throw new Error("Dorm field failed to save.");
    const entityName = dorm.dormName;
    const fieldLabel = dormFieldLabels[field];

    try {
      const updated = await patchAdminField<DormData>(
        "dorm",
        dorm.id,
        field,
        value,
        dorm.version,
      );
      applyUpdatedDorm(updated);
    } catch (error) {
      if (error instanceof ClientEditConflictError) {
        if (error.latest) applyUpdatedDorm(error.latest as DormData);
        throw new Error(
          `${entityName} ${fieldLabel} conflict. Showing latest server data; review before saving again.`,
        );
      }

      throw new Error(saveFailureMessage(entityName, fieldLabel, error));
    }
  }
</script>

<div class="dorm-result-wrapper">
  {#if dorm}
    <div class="dorm-header">
      <h2 class="dorm-title">{dorm.dormName}</h2>
      {#if showShortName()}
        <span class="dorm-short-name">{dorm.shortName}</span>
      {/if}
    </div>

    <div class="dorm-badges">
      {#if dorm.isUpManaged}
        <span class="badge up-badge">
          <BadgeCheck size={14} />
          UP-managed
        </span>
      {:else}
        <span class="badge private-badge"> Private </span>
      {/if}
      <span class="badge gender-badge" style:--badge-color={genderColor}>
        <Users size={14} />
        {genderLabel}
      </span>
      {#if dorm.capacity}
        <span class="badge capacity-badge">
          <Building2 size={14} />
          {dorm.capacity} beds
        </span>
      {/if}
    </div>

    {#if dorm.priceRange}
      <div class="price-row">
        <CircleDollarSign size={16} />
        <span class="price-value">{dorm.priceRange}</span>
        {#if !dorm.isUpManaged}
          <span class="price-disclaimer">
            <TriangleAlert size={12} />
            Verify with owner
          </span>
        {/if}
      </div>
    {/if}

    {#if dorm.description}
      <p class="dorm-desc">{dorm.description}</p>
    {/if}

    <div class="dorm-actions">
      {#if dorm.lon && dorm.lat}
        <button
          class="action-btn directions-btn"
          onclick={() => {
            locationStore.requestLocation();
            locationStore.setDestination([dorm.lon ?? 0, dorm.lat ?? 0]);
          }}
        >
          <CornerRightUp size={16} />
          Directions
        </button>
      {/if}
      {#if googleMapsLink}
        <a
          href={googleMapsLink}
          target="_blank"
          rel="noopener noreferrer"
          class="action-btn gmaps-btn"
        >
          <MapPin size={16} />
          Google Maps
        </a>
      {/if}
      {#if dorm.facebookLink}
        <a
          href={dorm.facebookLink}
          target="_blank"
          rel="noopener noreferrer"
          class="action-btn social-btn"
        >
          <ExternalLink size={16} />
          Facebook
        </a>
      {/if}
    </div>

    {#if editorEnabled}
      <div class="editor-card">
        <div class="editor-heading">
          <span>Dorm editor</span>
          <small>Version {dorm.version}</small>
        </div>
        <InlineEditField
          label="Name"
          value={dorm.dormName}
          onSave={(value) => saveDormField("dormName", value)}
        />
        <InlineEditField
          label="Short name"
          value={dorm.shortName}
          nullable
          onSave={(value) => saveDormField("shortName", value)}
        />
        <InlineEditField
          label="UP-managed"
          value={dorm.isUpManaged}
          inputType="checkbox"
          onSave={(value) => saveDormField("isUpManaged", value)}
        />
        <InlineEditField
          label="Gender"
          value={dorm.gender}
          inputType="select"
          options={genderOptions}
          onSave={(value) => saveDormField("gender", value)}
        />
        <InlineEditField
          label="Capacity"
          value={dorm.capacity}
          inputType="number"
          nullable
          onSave={(value) => saveDormField("capacity", value)}
        />
        <InlineEditField
          label="Price range"
          value={dorm.priceRange}
          nullable
          onSave={(value) => saveDormField("priceRange", value)}
        />
        <InlineEditField
          label="Description"
          value={dorm.description}
          inputType="textarea"
          nullable
          rows={4}
          onSave={(value) => saveDormField("description", value)}
        />
        <InlineEditField
          label="Managing office"
          value={dorm.managingOffice}
          nullable
          onSave={(value) => saveDormField("managingOffice", value)}
        />
        <InlineEditField
          label="Email"
          value={dorm.contactEmail}
          nullable
          onSave={(value) => saveDormField("contactEmail", value)}
        />
        <InlineEditField
          label="Phone"
          value={dorm.contactPhone ?? []}
          inputType="list"
          help="One phone number per line or comma-separated."
          onSave={(value) => saveDormField("contactPhone", value)}
        />
        <InlineEditField
          label="Amenities"
          value={dorm.amenities ?? []}
          inputType="list"
          help="One amenity per line or comma-separated."
          onSave={(value) => saveDormField("amenities", value)}
        />
        <InlineEditField
          label="OSM link"
          value={dorm.osmLink}
          nullable
          onSave={(value) => saveDormField("osmLink", value)}
        />
        <InlineEditField
          label="Facebook link"
          value={dorm.facebookLink}
          nullable
          onSave={(value) => saveDormField("facebookLink", value)}
        />
      </div>
    {/if}

    <hr class="dorm-divider" />

    <div class="dorm-details">
      <h3 class="section-title">Details</h3>

      {#if dorm.managingOffice}
        <div class="detail-row">
          <Building2 size={16} />
          <div>
            <span class="detail-label">Managing Office</span>
            <span class="detail-value">{dorm.managingOffice}</span>
          </div>
        </div>
      {/if}

      {#if dorm.contactEmail}
        <div class="detail-row">
          <Mail size={16} />
          <div>
            <span class="detail-label">Email</span>
            <a
              href="mailto:{dorm.contactEmail}"
              class="detail-value email-link"
            >
              {dorm.contactEmail}
            </a>
          </div>
        </div>
      {/if}

      {#if dorm.contactPhone}
        <div class="detail-row">
          <Phone size={16} />
          <div>
            <span class="detail-label">Phone</span>
            <span class="detail-value">{dorm.contactPhone}</span>
          </div>
        </div>
      {/if}
    </div>

    {#if amenities().length > 0}
      <div class="dorm-amenities">
        <h3 class="section-title">Amenities</h3>
        <div class="amenities-grid">
          {#each amenities() as amenity}
            <span class="amenity-tag">{amenity}</span>
          {/each}
        </div>
      </div>
    {/if}

    <div class="dorm-footer">
      {#if dorm.isUpManaged}
        <a
          href="https://uplbosa.org"
          target="_blank"
          rel="noopener noreferrer"
          class="osa-link"
        >
          <ExternalLink size={14} />
          UPLB OSA Website
        </a>
      {:else}
        <div class="private-tip">
          <TriangleAlert size={14} />
          <span
            >Prices and details may change. Always verify in person or contact
            directly before committing.</span
          >
        </div>
      {/if}
    </div>
  {:else}
    <div class="no-results">Dorm not found.</div>
  {/if}
</div>

<style>
  .dorm-result-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    flex: 1 1 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: hsl(6, 63%, 48%) hsl(0, 0%, 98%);
  }

  .dorm-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .dorm-title {
    font-size: 1.125rem;
    font-weight: bold;
    color: black;
    margin: 0;
    line-height: 1.3;
  }

  .dorm-short-name {
    font-size: 0.75rem;
    color: #7b1113;
    background-color: hsl(5, 53%, 95%);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .dorm-badges {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.625rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .gender-badge {
    background-color: color-mix(in srgb, var(--badge-color) 15%, white);
    color: var(--badge-color);
  }

  .capacity-badge {
    background-color: hsl(0, 0%, 93%);
    color: #4f4f4f;
  }

  .up-badge {
    background-color: hsl(5, 53%, 93%);
    color: #7b1113;
  }

  .private-badge {
    background-color: hsl(210, 50%, 93%);
    color: hsl(210, 60%, 40%);
  }

  .price-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #333;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .price-value {
    color: hsl(150, 45%, 35%);
  }

  .price-disclaimer {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.6875rem;
    color: hsl(35, 80%, 45%);
    font-weight: 500;
  }

  .dorm-desc {
    font-size: 0.8125rem;
    color: #4f4f4f;
    margin: 0;
    line-height: 1.5;
  }

  .dorm-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .editor-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid hsl(160, 42%, 82%);
    border-radius: 0.75rem;
    background: hsla(160, 42%, 96%, 0.88);
  }

  .editor-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    color: hsl(160, 84%, 18%);
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .editor-heading small {
    color: #666;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    text-decoration: none;
    width: max-content;
  }

  .directions-btn {
    background-color: #7b1113;
    color: white;
  }

  .directions-btn:hover {
    background-color: #9a1517;
  }

  .gmaps-btn {
    background-color: hsl(210, 50%, 93%);
    color: hsl(210, 60%, 35%);
  }

  .gmaps-btn:hover {
    background-color: hsl(210, 50%, 87%);
  }

  .social-btn {
    background-color: hsl(220, 50%, 93%);
    color: hsl(220, 60%, 40%);
  }

  .social-btn:hover {
    background-color: hsl(220, 50%, 87%);
  }

  .dorm-divider {
    margin: 0.25rem 0;
    border: none;
    border-top: 1px solid #ececec;
  }

  .dorm-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-title {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #333;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .detail-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    color: #666;
  }

  .detail-row > div {
    display: flex;
    flex-direction: column;
  }

  .detail-label {
    font-size: 0.6875rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .detail-value {
    font-size: 0.8125rem;
    color: #333;
  }

  .email-link {
    color: #7b1113;
    text-decoration: none;
  }

  .email-link:hover {
    text-decoration: underline;
  }

  .dorm-amenities {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .amenities-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .amenity-tag {
    padding: 0.25rem 0.625rem;
    background-color: hsl(0, 0%, 96%);
    border: 1px solid hsl(0, 0%, 90%);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: #555;
  }

  .dorm-footer {
    margin-top: auto;
    padding-top: 0.5rem;
    border-top: 1px solid #ececec;
  }

  .osa-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #7b1113;
    text-decoration: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    transition: background-color 0.15s;
  }

  .osa-link:hover {
    background-color: hsl(5, 53%, 95%);
  }

  .private-tip {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
    font-size: 0.6875rem;
    color: hsl(35, 80%, 45%);
    line-height: 1.4;
    padding: 0.375rem 0;
  }

  .no-results {
    color: #666;
    font-size: 0.875rem;
    text-align: center;
    padding: 1rem 0;
  }
</style>
