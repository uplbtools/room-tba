<script lang="ts">
	import { delay } from 'es-toolkit';
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { HTMLFormAttributes } from 'svelte/elements';

	interface Props extends HTMLFormAttributes {
		children: Snippet;
	}
	const { children, ...props }: Props = $props();

	const formAttachment: Attachment<HTMLFormElement> = (form) => {
		return () => {
			form.reset();
			delay(1000);
			console.log('removing from the DOM');
		};
	};
</script>

<form {...props} class="flex flex-col gap-3" {@attach formAttachment}>
	{@render children()}
	<div>
		<button type="reset">Reset</button>
		<button type="submit">Submit</button>
	</div>
</form>
