<script lang="ts">
	import BookText from '@lucide/svelte/icons/book-text';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import School from '@lucide/svelte/icons/school';
	import University from '@lucide/svelte/icons/university';
	import Users from '@lucide/svelte/icons/users';
	import {
		openBrowseClasses,
		openCampusBrowse,
		type CampusBrowseTab
	} from '$lib/utils/campus/browse-campus';
	import { searchInfo, sidePanelStore } from '$lib/stores.svelte';
	import '../map-chrome/map-chrome.css';

	type ChipId = CampusBrowseTab | 'classes';

	const tabs: {
		id: ChipId;
		label: string;
		icon: typeof University;
	}[] = [
		{ id: 'buildings', label: 'Buildings', icon: University },
		{ id: 'colleges', label: 'Colleges', icon: GraduationCap },
		{ id: 'divisions', label: 'Divisions', icon: School },
		{ id: 'organizations', label: 'Student orgs', icon: Users },
		{ id: 'offices', label: 'Offices & units', icon: Briefcase },
		{ id: 'classes', label: 'Classes', icon: BookText }
		// Planner is pinned as a standalone always-visible chip in Search.svelte.
	];

	const activeTab = $derived.by((): ChipId | null => {
		if (searchInfo.category === 'classes') return 'classes';
		if (searchInfo.category !== 'browse') return null;
		if (
			searchInfo.queryValue === 'colleges' ||
			searchInfo.queryValue === 'divisions' ||
			searchInfo.queryValue === 'organizations' ||
			searchInfo.queryValue === 'offices'
		) {
			return searchInfo.queryValue;
		}
		return 'buildings';
	});

	function handleBrowse(id: ChipId) {
		if (id === 'classes') {
			openBrowseClasses(searchInfo, sidePanelStore);
			return;
		}
		openCampusBrowse(searchInfo, sidePanelStore, id);
	}
</script>

<div class="campus-browse-chips" role="toolbar" aria-label="Browse campus">
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			class="map-chrome-chip campus-browse-chip"
			class:map-chrome-chip--toggle-active={activeTab === tab.id}
			aria-pressed={activeTab === tab.id}
			aria-label={tab.id === 'classes'
				? 'Browse all classes'
				: tab.id === 'organizations'
					? 'Browse student organizations'
					: tab.id === 'offices'
						? 'Browse offices and academic units'
						: `Browse ${tab.label.toLowerCase()}`}
			onclick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				handleBrowse(tab.id);
			}}
		>
			<span class="map-chrome-chip__icon" aria-hidden="true">
				<tab.icon size={14} />
			</span>
			<span>{tab.label}</span>
		</button>
	{/each}
</div>

<style>
	.campus-browse-chips {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 0.375rem;
		min-width: 0;
	}
</style>
