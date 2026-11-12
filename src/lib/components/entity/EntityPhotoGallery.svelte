<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { EntityPhoto } from '#lib/utils/entity/entity-photos.js';
	type Props = {
		name: string;
		photos?: EntityPhoto[];
		imageUrl?: string | null;
		alt?: string;
	};

	type GalleryImage = {
		src: string;
		alt: string;
		attributionName: string | null;
		attributionProfileUrl: string | null;
	};

	let { name, photos = [], imageUrl = null, alt = name }: Props = $props();

	const images = $derived.by(() => {
		if (photos.length > 0) {
			return photos.map((photo): GalleryImage => ({
				src: photo.url,
				alt,
				attributionName: photo.attributionName,
				attributionProfileUrl: photo.attributionProfileUrl
			}));
		}
		return imageUrl
			? [
					{
						src: imageUrl,
						alt,
						attributionName: null,
						attributionProfileUrl: null
					}
				]
			: [];
	});

	let index = $state(0);
	$effect(() => {
		name;
		photos;
		imageUrl;
		index = 0;
	});

	const current = $derived(images[Math.min(index, images.length - 1)]);

	function previous() {
		index = (index - 1 + images.length) % images.length;
	}

	function next() {
		index = (index + 1) % images.length;
	}
</script>

{#if current}
	<figure class="entity-photo-gallery">
		<div class="entity-photo-gallery__frame">
			<img
				class="entity-image"
				src={current.src}
				alt={current.alt}
				width="800"
				height="450"
				loading="lazy"
				decoding="async"
				referrerpolicy="strict-origin-when-cross-origin"
			/>
			{#if images.length > 1}
				<button
					type="button"
					class="entity-photo-gallery__nav entity-photo-gallery__nav--prev"
					onclick={previous}
					aria-label={`Previous photo of ${name}`}
				>
					<ChevronLeft size={18} aria-hidden="true" />
				</button>
				<button
					type="button"
					class="entity-photo-gallery__nav entity-photo-gallery__nav--next"
					onclick={next}
					aria-label={`Next photo of ${name}`}
				>
					<ChevronRight size={18} aria-hidden="true" />
				</button>
				<span class="entity-photo-gallery__counter" aria-live="polite">
					{index + 1}/{images.length}
				</span>
			{/if}
		</div>
		{#if current.attributionName}
			<figcaption class="entity-photo-gallery__credit">
				Photo by
				{#if current.attributionProfileUrl}
					<a href={current.attributionProfileUrl} target="_blank" rel="noopener noreferrer"
						>{current.attributionName}</a
					>
				{:else}
					<span>{current.attributionName}</span>
				{/if}
			</figcaption>
		{/if}
	</figure>
{/if}

<style>
	.entity-photo-gallery {
		margin: 0;
	}

	.entity-photo-gallery__frame {
		position: relative;
	}

	.entity-photo-gallery__nav {
		position: absolute;
		top: 50%;
		translate: 0 -50%;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		border: none;
		border-radius: 50%;
		background-color: hsla(0, 0%, 100%, 0.85);
		color: hsl(0, 0%, 20%);
		cursor: pointer;
		box-shadow: 0 1px 4px hsla(0, 0%, 0%, 0.3);
	}

	.entity-photo-gallery__nav:hover {
		background-color: white;
	}

	.entity-photo-gallery__nav:focus-visible {
		outline: 2px solid hsl(5, 53%, 32%);
		outline-offset: 1px;
	}

	.entity-photo-gallery__nav--prev {
		left: 0.375rem;
	}

	.entity-photo-gallery__nav--next {
		right: 0.375rem;
	}

	.entity-photo-gallery__counter {
		position: absolute;
		right: 0.375rem;
		bottom: 0.5rem;
		padding: 0.0625rem 0.375rem;
		border-radius: 0.5rem;
		background-color: hsla(0, 0%, 0%, 0.55);
		color: white;
		font-size: 0.6875rem;
		line-height: 1.4;
	}

	.entity-photo-gallery__credit {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		padding: 0.25rem 0.1rem 0;
		color: #6b6265;
		font-size: 0.6875rem;
		line-height: 1.3;
	}

	.entity-photo-gallery__credit a {
		color: inherit;
	}
</style>
