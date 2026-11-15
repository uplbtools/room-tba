<script lang="ts">
	import { getModalStore } from '#lib/utils/context.js';

	const { data }: { data: Record<string, unknown> } = $props();
	const modalStore = getModalStore();
</script>

<button
	class="self-start rounded-full border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
	onclick={() => modalStore.openModal('modify-suggestion', data)}>Suggest an edit</button
>
