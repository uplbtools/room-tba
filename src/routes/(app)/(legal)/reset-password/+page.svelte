<script lang="ts">
	import ResetPasswordForm from './ResetPasswordForm.svelte';

	const { data } = $props();
</script>

<h1>Reset your password</h1>
<ResetPasswordForm token={data.token} tokenState={data.tokenState} />
