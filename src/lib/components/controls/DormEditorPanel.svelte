<script lang="ts">
	import EntityEditorCheckboxField from '#lib/components/editor/EntityEditorCheckboxField.svelte';
	import EntityEditorField from '#lib/components/editor/EntityEditorField.svelte';
	import EntityEditorPanel from '#lib/components/editor/EntityEditorPanel.svelte';
	import EntityEditorPinRow from '#lib/components/editor/EntityEditorPinRow.svelte';
	import EntityPhotoUpload from '#lib/components/editor/EntityPhotoUpload.svelte';
	import {
		entityEditorSavedMessage,
		fieldSaveActionLabel
	} from '#lib/utils/editor/field-action-label.js';
	import { adminAuthStore, mapEditStore, mapProposalStore } from '#lib/stores.svelte.js';
	import type { DormData } from '#lib/utils/types';
	import '../editor/entity-editor.css';
	import type { EntityPhoto } from '#lib/utils/entity/entity-photos.js';

	type DormEditableField =
		| 'dormName'
		| 'shortName'
		| 'description'
		| 'gender'
		| 'isUpManaged'
		| 'capacity'
		| 'priceRange'
		| 'managingOffice'
		| 'contactEmail'
		| 'contactPhone'
		| 'amenities'
		| 'facebookLink'
		| 'osmLink'
		| 'photos';

	type Props = {
		dorm: DormData;
		canPublish: boolean;
		savingField: DormEditableField | null;
		savedField: DormEditableField | null;
		fieldError: string | null;
		proposalStatus: string | null;
		activeProposalId?: number | null;
		onWithdrawn?: () => void;
		onsubmit?: () => void;
		submitting?: boolean;
		submitDisabled?: boolean;
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
		photosDraft: EntityPhoto[];
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
		activeProposalId = null,
		onWithdrawn,
		onsubmit,
		submitting = false,
		submitDisabled = false,
		submitterNameDraft = $bindable(''),
		nameDraft = $bindable(''),
		shortNameDraft = $bindable(''),
		descriptionDraft = $bindable(''),
		genderDraft = $bindable(''),
		isUpManagedDraft = $bindable(false),
		capacityDraft = $bindable(''),
		priceRangeDraft = $bindable(''),
		managingOfficeDraft = $bindable(''),
		contactEmailDraft = $bindable(''),
		contactPhoneDraft = $bindable(''),
		amenitiesDraft = $bindable(''),
		facebookLinkDraft = $bindable(''),
		osmLinkDraft = $bindable(''),
		photosDraft = $bindable([]),
		fieldLabel,
		fieldIsUnchanged,
		saveField,
		enablePinProposal
	}: Props = $props();

	const disabled = $derived(savingField !== null);
</script>

<EntityEditorPanel
	{canPublish}
	showSubmitterName={!canPublish && !adminAuthStore.isLoggedIn}
	submitterNameId="dorm-submitter-name"
	historyEntity={{ entityType: 'dorm', entityId: dorm.id, version: dorm.version }}
	bind:submitterName={submitterNameDraft}
	{proposalStatus}
	{activeProposalId}
	{onWithdrawn}
	{onsubmit}
	{submitting}
	{submitDisabled}
	successMessage={savedField
		? entityEditorSavedMessage({
				canPublish,
				savedFieldLabel: fieldLabel(savedField)
			})
		: null}
	errorMessage={fieldError}
>
	<EntityEditorField
		label="Dorm name"
		inputId="dorm-name-editor"
		{canPublish}
		{disabled}
		fieldSaving={savingField === 'dormName'}
		unchanged={fieldIsUnchanged('dormName', dorm)}
		onsave={() => saveField('dormName')}
	>
		{#snippet control()}
			<input id="dorm-name-editor" bind:value={nameDraft} {disabled} autocomplete="off" />
		{/snippet}
	</EntityEditorField>

	<EntityEditorField
		label="Short name"
		inputId="dorm-short-name-editor"
		{canPublish}
		{disabled}
		fieldSaving={savingField === 'shortName'}
		unchanged={fieldIsUnchanged('shortName', dorm)}
		onsave={() => saveField('shortName')}
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
		fieldSaving={savingField === 'description'}
		unchanged={fieldIsUnchanged('description', dorm)}
		onsave={() => saveField('description')}
	>
		{#snippet control()}
			<textarea id="dorm-description-editor" bind:value={descriptionDraft} {disabled} rows="3"
			></textarea>
		{/snippet}
	</EntityEditorField>

	<div class="editor-grid">
		<EntityEditorField
			label="Gender policy"
			inputId="dorm-gender-editor"
			{canPublish}
			{disabled}
			fieldSaving={savingField === 'gender'}
			unchanged={fieldIsUnchanged('gender', dorm)}
			onsave={() => saveField('gender')}
		>
			{#snippet control()}
				<select id="dorm-gender-editor" bind:value={genderDraft} {disabled}>
					<option value="">Not recorded</option>
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
			fieldSaving={savingField === 'capacity'}
			unchanged={fieldIsUnchanged('capacity', dorm)}
			onsave={() => saveField('capacity')}
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
		fieldSaving={savingField === 'isUpManaged'}
		unchanged={fieldIsUnchanged('isUpManaged', dorm)}
		onsave={() => saveField('isUpManaged')}
	/>

	<EntityEditorField
		label="Price range"
		inputId="dorm-price-editor"
		{canPublish}
		{disabled}
		fieldSaving={savingField === 'priceRange'}
		unchanged={fieldIsUnchanged('priceRange', dorm)}
		onsave={() => saveField('priceRange')}
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
		fieldSaving={savingField === 'managingOffice'}
		unchanged={fieldIsUnchanged('managingOffice', dorm)}
		onsave={() => saveField('managingOffice')}
	>
		{#snippet control()}
			<input id="dorm-office-editor" bind:value={managingOfficeDraft} {disabled} />
		{/snippet}
	</EntityEditorField>

	<EntityEditorField
		label="Contact email"
		inputId="dorm-email-editor"
		{canPublish}
		{disabled}
		fieldSaving={savingField === 'contactEmail'}
		unchanged={fieldIsUnchanged('contactEmail', dorm)}
		onsave={() => saveField('contactEmail')}
	>
		{#snippet control()}
			<input id="dorm-email-editor" type="email" bind:value={contactEmailDraft} {disabled} />
		{/snippet}
	</EntityEditorField>

	<EntityEditorField
		label="Contact phones"
		inputId="dorm-phone-editor"
		{canPublish}
		{disabled}
		stacked
		fieldSaving={savingField === 'contactPhone'}
		unchanged={fieldIsUnchanged('contactPhone', dorm)}
		onsave={() => saveField('contactPhone')}
	>
		{#snippet control()}
			<textarea
				id="dorm-phone-editor"
				bind:value={contactPhoneDraft}
				{disabled}
				rows="3"
				placeholder="One phone number per line"></textarea>
		{/snippet}
	</EntityEditorField>

	<EntityEditorField
		label="Amenities"
		inputId="dorm-amenities-editor"
		{canPublish}
		{disabled}
		stacked
		fieldSaving={savingField === 'amenities'}
		unchanged={fieldIsUnchanged('amenities', dorm)}
		onsave={() => saveField('amenities')}
	>
		{#snippet control()}
			<textarea
				id="dorm-amenities-editor"
				bind:value={amenitiesDraft}
				{disabled}
				rows="4"
				placeholder="One amenity per line"></textarea>
		{/snippet}
	</EntityEditorField>

	<EntityEditorField
		label="Facebook link"
		inputId="dorm-facebook-editor"
		{canPublish}
		{disabled}
		fieldSaving={savingField === 'facebookLink'}
		unchanged={fieldIsUnchanged('facebookLink', dorm)}
		onsave={() => saveField('facebookLink')}
	>
		{#snippet control()}
			<input id="dorm-facebook-editor" type="url" bind:value={facebookLinkDraft} {disabled} />
		{/snippet}
	</EntityEditorField>

	<EntityEditorField
		label="OpenStreetMap link"
		inputId="dorm-osm-editor"
		{canPublish}
		{disabled}
		fieldSaving={savingField === 'osmLink'}
		unchanged={fieldIsUnchanged('osmLink', dorm)}
		onsave={() => saveField('osmLink')}
	>
		{#snippet control()}
			<input id="dorm-osm-editor" type="url" bind:value={osmLinkDraft} {disabled} />
		{/snippet}
	</EntityEditorField>

	<div class="editor-image-row">
		<EntityPhotoUpload
			label="Dorm photos (optional)"
			inputId="dorm-photo-editor"
			endpoint={canPublish ? '/api/uploads/editor-photo' : '/api/uploads/suggestion-photo'}
			prefix={`dorms/${dorm.id}`}
			bind:photos={photosDraft}
			disabled={savingField !== null}
		/>
		<button
			type="button"
			class="field-save-btn"
			disabled={disabled || fieldIsUnchanged('photos', dorm)}
			onclick={() => saveField('photos')}
		>
			{fieldSaveActionLabel({
				canPublish,
				isSaving: savingField === 'photos'
			})}
		</button>
	</div>

	<p class="editor-note">
		{#if canPublish}
			{#if mapEditStore.enabled}
				Map editing is on. Drag this dorm's pin on the map to move it.
			{:else}
				Move this dorm's map pin from the map after enabling edit mode.
			{/if}
		{:else if dorm.lat && dorm.lon}
			{#if mapProposalStore.allowsKey(`dorm:${dorm.id}`)}
				Pin move mode is on. Drag this dorm's marker on the map.
			{:else}
				Suggest a map pin move, then drag its marker on the map.
			{/if}
		{/if}
	</p>
	{#if canPublish && !mapEditStore.enabled}
		<EntityEditorPinRow
			label="Map pin"
			pickLabel="Enable map edit"
			{disabled}
			onclick={() => mapEditStore.enable()}
		/>
	{:else if !canPublish && dorm.lat && dorm.lon && !mapProposalStore.allowsKey(`dorm:${dorm.id}`)}
		<EntityEditorPinRow
			label="Map pin"
			pickLabel="Enable pin move"
			{disabled}
			onclick={enablePinProposal}
		/>
	{/if}
</EntityEditorPanel>
