<script lang="ts">
	import FollowUpdates from '#lib/components/community/FollowUpdates.svelte';
	import { parseChangelogEntries, userFacingEntries } from '#lib/utils/changelog-highlights.js';
	import { releaseTimestampLabel } from '#lib/utils/release-timestamps.js';
	import changelogRaw from '../../../../../CHANGELOG.md?raw';

	const entries = userFacingEntries(parseChangelogEntries(changelogRaw));
</script>

<h1>Changelog</h1>
<p>
	Room TBA is updated regularly, especially every term, to reflect the latest course offerings, room
	status and other campus data. Below are the updates made to the app since its first release.
</p>
<FollowUpdates
	note="Prefer not to check back? The releases worth knowing about are posted to the UPLB Tools accounts as they ship."
/>

{#each entries as entry (entry.version)}
	<section>
		<h2>
			v{entry.version}
			<span class="text-sm font-normal text-neutral-500">
				{releaseTimestampLabel(entry.version) ?? entry.date ?? ''}
			</span>
		</h2>
		{#each entry.sections as section}
			{#if section.title}
				<h3>{section.title}</h3>
			{/if}
			<ul>
				{#each section.items as item}
					<li>{item}</li>
				{/each}
			</ul>
		{/each}
	</section>
{/each}
