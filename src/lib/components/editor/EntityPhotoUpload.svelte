<script lang="ts">
	import { MAX_ENTITY_PHOTOS, type EntityPhoto } from '#lib/utils/entity/entity-photos.js';
	import ImageUpload from './ImageUpload.svelte';

	type Props = {
		photos?: EntityPhoto[];
		prefix?: string;
		endpoint?: string;
		disabled?: boolean;
		inputId?: string;
		label?: string;
		onuploaded?: (url: string) => void;
	};

	let {
		photos = $bindable([]),
		prefix = 'uploads',
		endpoint = '/api/uploads/editor-photo',
		disabled = false,
		inputId = 'entity-photo-upload',
		label = 'Photos (optional)',
		onuploaded
	}: Props = $props();

	const slotCount = $derived(Math.min(MAX_ENTITY_PHOTOS, Math.max(1, photos.length + 1)));

	function updatePhoto(index: number, url: string | null) {
		const next = [...photos];
		if (url) {
			next[index] = {
				url,
				attributionName: null,
				attributionProfileUrl: null
			};
		} else {
			next.splice(index, 1);
		}
		photos = next;
	}
</script>

<div class="entity-photo-upload">
	<p class="entity-photo-upload__label">{label}</p>
	<p class="entity-editor-muted entity-photo-upload__hint">
		Add up to {MAX_ENTITY_PHOTOS} photos. JPEG, PNG, or WebP up to 5 MB each.
	</p>
	<div class="entity-photo-upload__items">
		{#each Array.from({ length: slotCount }) as _, index (index)}
			<div class="entity-photo-upload__item">
				<ImageUpload
					inputId={`${inputId}-${index + 1}`}
					label={`Photo ${index + 1}`}
					{prefix}
					{endpoint}
					value={photos[index]?.url ?? null}
					{disabled}
					onValueChange={(url) => updatePhoto(index, url)}
					{onuploaded}
				/>
				{#if photos[index]?.attributionName}
					<p class="entity-photo-upload__credit">
						Photo by
						{#if photos[index]?.attributionProfileUrl}
							<a
								href={photos[index].attributionProfileUrl}
								target="_blank"
								rel="noopener noreferrer">{photos[index].attributionName}</a
							>
						{:else}
							<span>{photos[index].attributionName}</span>
						{/if}
					</p>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.entity-photo-upload {
		display: grid;
		gap: 0.5rem;
	}

	.entity-photo-upload__label {
		margin: 0;
		color: #3d3437;
		font-size: 0.875rem;
		font-weight: 650;
	}

	.entity-photo-upload__hint {
		margin: 0;
	}

	.entity-photo-upload__items {
		display: grid;
		gap: 0.625rem;
	}

	.entity-photo-upload__item {
		min-width: 0;
	}

	.entity-photo-upload__credit {
		margin: -0.125rem 0 0;
		color: #6b6265;
		font-size: 0.6875rem;
	}

	.entity-photo-upload__credit a {
		color: inherit;
	}
</style>
