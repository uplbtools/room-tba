<script lang="ts">
	import Phone from '@lucide/svelte/icons/phone';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import {
		EMERGENCY_HOTLINE_CATEGORIES,
		emergencyHotlinesVCard,
		emergencyHotlineTel,
		formatHotlineNumber
	} from '#lib/constants/content/emergency-hotlines.js';

	function saveContacts() {
		const url = URL.createObjectURL(
			new Blob([emergencyHotlinesVCard()], { type: 'text/vcard;charset=utf-8' })
		);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'uplb-emergency-hotlines.vcf';
		// Safari needs the link in the document
		document.body.append(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}
</script>

<div class="flex flex-wrap items-start justify-between gap-3">
	<div>
		<h2 class="text-xl font-semibold">Emergency hotlines</h2>
		<p class="text-sm text-neutral-600">
			Tap a number to call. Save these contacts before you need them.
		</p>
	</div>
	<button
		type="button"
		class="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-neutral-300 px-3.5 text-sm font-semibold hover:bg-neutral-50"
		onclick={saveContacts}
	>
		<UserPlus size={16} aria-hidden="true" />
		Save contacts
	</button>
</div>

{#each EMERGENCY_HOTLINE_CATEGORIES as category}
	<section class="grid gap-2.5" aria-labelledby="hotlines-{category.name}">
		<h3 id="hotlines-{category.name}" class="text-sm font-medium text-[hsl(345_75%_31%)]">
			{category.name}
		</h3>
		{#each category.entries as entry}
			<div class="grid gap-1.5 text-sm">
				<strong>{entry.name}</strong>
				<div class="flex flex-wrap gap-1.5">
					{#each entry.numbers as number}
						<a
							class="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[hsl(5_34%_82%)] bg-[hsl(0_100%_99%)] px-3 font-bold whitespace-nowrap text-[hsl(5_53%_32%)] tabular-nums hover:bg-[hsl(0_78%_97%)]"
							href={emergencyHotlineTel(number)}
							aria-label="Call {entry.name}, {formatHotlineNumber(number)}"
						>
							<Phone size={16} aria-hidden="true" />
							{formatHotlineNumber(number)}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</section>
{/each}
