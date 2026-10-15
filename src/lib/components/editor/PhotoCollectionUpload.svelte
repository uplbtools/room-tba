<script lang="ts">
	import type { EntityPhoto } from '#lib/utils/entity/entity-photos.js';
	import EntityPhotoUpload from './EntityPhotoUpload.svelte';

	type Props = {
		values?: string[];
		prefix?: string;
		endpoint?: string;
		disabled?: boolean;
		inputId?: string;
		label?: string;
	};

	let {
		values = $bindable([]),
		prefix = 'uploads',
		endpoint = '/api/uploads/editor-photo',
		disabled = false,
		inputId = 'entity-photo-upload',
		label = 'Photos (optional)'
	}: Props = $props();

	let photos = $state<EntityPhoto[]>([]);

	function urlsEqual(left: string[], right: string[]) {
		return left.length === right.length && left.every((url, index) => url === right[index]);
	}

	$effect(() => {
		const next = values.map((url) => ({
			url,
			attributionName: null,
			attributionProfileUrl: null
		}));
		if (
			!urlsEqual(
				next.map((photo) => photo.url),
				photos.map((photo) => photo.url)
			)
		) {
			photos = next;
		}
	});

	$effect(() => {
		const next = photos.map((photo) => photo.url);
		if (!urlsEqual(next, values)) values = next;
	});
</script>

<EntityPhotoUpload bind:photos {prefix} {endpoint} {disabled} {inputId} {label} />
