<script lang="ts">
	import InviteAcceptForm from './InviteAcceptForm.svelte';

	const { data } = $props();
</script>

<h1>Join Room TBA</h1>
<InviteAcceptForm token={data.token} invite={data.invite} />
