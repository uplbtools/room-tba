<script lang="ts">
	import { page } from '$app/state';
	import InfoPanel from '#lib/components/new/InfoPanel.svelte';
	import LoadingIndicator from '#lib/components/LoadingIndicator.svelte';
	import { getAuditLog } from '#lib/functions/audit-log.remote.js';
	import { getAdminAuthStore } from '#lib/utils/context.js';

	const adminAuthStore = getAdminAuthStore();

	const LABELS: Record<string, string> = {
		'login.success': 'Signed in',
		'login.failure': 'Failed sign-in',
		'user.created': 'Account created',
		'user.invited': 'Invite sent',
		'user.invite_accepted': 'Invite accepted',
		'user.role_changed': 'Role changed',
		'user.activated': 'Account reactivated',
		'user.deactivated': 'Account deactivated',
		'password.reset_requested': 'Password reset requested',
		'password.reset_completed': 'Password reset',
		'password.changed': 'Password changed',
		'proposal.approved': 'Suggestion approved',
		'proposal.rejected': 'Suggestion rejected',
		'proposal.changes_requested': 'Changes requested',
		'access.requested': 'Editor access requested',
		'access.approved': 'Editor access granted',
		'access.declined': 'Editor access declined'
	};

	const before = $derived(Number(page.url.searchParams.get('before')) || null);

	const when = new Intl.DateTimeFormat('en-PH', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'Asia/Manila'
	});

	function detailText(detail: unknown): string {
		if (!detail || typeof detail !== 'object') return '';
		const d = detail as Record<string, unknown>;
		if (typeof d.from === 'string' && typeof d.to === 'string') return `${d.from} to ${d.to}`;
		if (typeof d.entityLabel === 'string') return d.entityLabel;
		if (typeof d.role === 'string') return `as ${d.role}`;
		if (d.emailFailed) return 'email failed to send';
		return '';
	}
</script>

<svelte:head>
	<title>Audit log | Room TBA</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<InfoPanel>
	{#if adminAuthStore.role !== 'admin'}
		<p class="p-4 text-sm">Sign in as an admin to see the audit log.</p>
	{:else}
		<section class="flex flex-col gap-2 p-4" aria-labelledby="audit-title">
			<h2 id="audit-title" class="text-xl font-semibold">Audit log</h2>
			<p class="text-sm text-neutral-600">
				Sign-ins, account changes and review decisions appear here. Only admins can see this.
			</p>
			<svelte:boundary>
				{#snippet pending()}
					<LoadingIndicator />
				{/snippet}
				{#snippet failed()}
					<p class="text-sm text-red-900">Couldn't load the audit log.</p>
				{/snippet}
				{@const log = await getAuditLog(before)}
				{#if log.entries.length === 0}
					<p class="text-sm">There are no entries yet.</p>
				{:else}
					<ol aria-label="Audit log entries">
						{#each log.entries as entry (entry.id)}
							{@const detail = detailText(entry.detail)}
							<li
								class="flex flex-col gap-0.5 border-b border-neutral-200 py-2 text-sm [overflow-wrap:anywhere] last:border-b-0"
							>
								<span class="flex flex-wrap gap-1.5">
									<strong>{LABELS[entry.action] ?? entry.action}</strong>
									{#if entry.targetLabel}<span>{entry.targetLabel}</span>{/if}
									{#if detail}<span class="text-neutral-600">{detail}</span>{/if}
								</span>
								<small class="text-neutral-600">
									{when.format(new Date(`${entry.createdAt.replace(' ', 'T')}Z`))}{entry.actorLabel
										? `, by ${entry.actorLabel}`
										: ''}{entry.ip && entry.ip !== 'unknown' ? `, ${entry.ip}` : ''}
								</small>
							</li>
						{/each}
					</ol>
				{/if}
				{#if log.nextBefore}
					<a
						class="inline-flex min-h-10 w-fit items-center rounded-full border border-neutral-400 px-4 font-semibold"
						href="?before={log.nextBefore}">Older entries</a
					>
				{/if}
			</svelte:boundary>
		</section>
	{/if}
</InfoPanel>
