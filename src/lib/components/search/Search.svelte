<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import MapPinPlus from '@lucide/svelte/icons/map-pin-plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { debounce } from 'es-toolkit';
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	// import MapFilterChips from '$lib/components/map-chrome/MapFilterChips.svelte';
	// import { getAppData } from "$lib/utils/context";
	import { observeBlockHeight } from '$lib/utils/layout-css-vars';
	// import { getMapChromeVisibility } from '$lib/utils/map/map-chrome';
	import { dropdownFadeIn, dropdownFadeOut } from '$lib/utils/motion';
	import { registerEphemeralOverlayDismisser } from '$lib/utils/overlay-stack';
	import { registerSearchFocus } from '$lib/utils/search-focus';
	import { getSearchInfo } from '$lib/utils/context';
	import Suggestions from './Suggestions.svelte';
	import { getUnionSuggestions } from '$lib/functions/search.remote';
	import { X } from '@lucide/svelte';
	// import {
	// 	adminAuthStore,
	// 	editorChromeStore,
	// 	mapEditStore,
	// 	modalStore,
	// 	proposalsStore,
	// 	searchInfo,
	// 	sidePanelStore,
	// } from "$lib/stores.svelte";
	// import Suggestions from './Suggestions.svelte';

	let searchElement = $state<HTMLInputElement | null>(null);
	let shellMainEl = $state<HTMLDivElement | null>(null);
	let chromeEl = $state<HTMLDivElement | null>(null);
	let searchFocused = $state(false);
	const mobile = new MediaQuery('max-width:48rem');
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	const searchInfo = getSearchInfo();

	// const chrome = $derived(getMapChromeVisibility());

	$effect(() => {
		const el = mobile.current ? shellMainEl : chromeEl;
		if (!el) return;
		return observeBlockHeight(el, '--search-block-height');
	});

	onMount(() => {
		const unregisterFocus = registerSearchFocus(() => {
			searchElement?.focus();
			searchElement?.select();
		});
		const unregisterDismiss = registerEphemeralOverlayDismisser(() => {
			searchFocused = false;
			searchElement?.blur();
		});
		return () => {
			unregisterFocus();
			unregisterDismiss();
		};
	});

	function handleInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		if (searchInfo.type === 'result' || searchInfo.category !== null) {
			searchInfo.exitResultMode();
		}
		commitSearchInput(event.currentTarget.value);
	}

	const commitSearchInput = debounce((searchInput: string) => {
		searchInfo.inputValue = searchInput;
		searchInfo.setType('query');
	}, 500);

	// const concurrentSuggestions = $derived(
	// 	searchInfo.inputValue !== '' ? await getSuggestions(searchInfo.inputValue) : null
	// );

	// $effect(() => {
	// 	if (searchInfo.type === "result" || searchInfo.category !== null) {
	// 		draftInput = searchInfo.inputValue;
	// 		return;
	// 	}
	// 	if (searchInfo.inputValue === "") {
	// 		draftInput = "";
	// 	}
	// });

	// function closeSearchContext() {
	// 	commitSearchInput.cancel();
	// 	searchInfo.clearQuery();
	// 	draftInput = "";
	// 	searchElement?.focus();
	// 	// `openPanel()` metadata outranks the query in resolvePanelContent, so
	// 	// clearing the query alone would leave a stale panel on screen.
	// 	goto(resolve("/map"));
	// 	sidePanelStore.closePanel();
	// }

	function dismissMobileSearch() {
		searchFocused = false;
		searchElement?.blur();
	}

	const mobileSearchActive = $derived(mobile.current && searchFocused);

	const clearSelectionLabel = $derived(
		searchInfo.type === 'result' && searchInfo.category !== null ? 'Close details' : 'Clear search'
	);

	// function openEditorTools() {
	// 	searchFocused = false;
	// 	searchElement?.blur();
	// 	modalStore.openModal("editor-tools");
	// }

	// const showEditorChrome = $derived(
	// 	chrome.showEditorShelf &&
	// 		(adminAuthStore.canPublish || adminAuthStore.canReview),
	// );

	// const editorChipLabel = $derived(mapEditStore.enabled ? "Editing" : "Editor");
	// const editorOpenLabel = $derived(
	// 	proposalsStore.pendingCount > 0
	// 		? `Open editor tools, ${proposalsStore.pendingCount} pending`
	// 		: "Open editor tools",
	// );

	// const showSearchDropdown = $derived(chrome.showSearchSuggestions && searchFocused);

	// $effect(() => {
	// 	if (searchInfo.category !== null && searchInfo.type === "result") {
	// 		searchElement?.blur();
	// 	}
	// });

	function clearSearch() {
		goto(resolve('/map'));
		searchInfo.clearSearch();
	}
</script>

<div
	class="search-root"
	class:mobile-shell={mobile.current}
	class:search-input-focused={searchFocused}
	class:search-mobile-active={mobileSearchActive}
	class:search-query-active={searchInfo.inputValue.trim() !== ''}
>
	<div class="search-shell-main" bind:this={shellMainEl}>
		<div
			bind:this={chromeEl}
			class="map-search-chrome"
			class:map-search-chrome--redesign={!mobile.current}
			class:map-search-chrome--mobile-redesign={mobile.current}
		>
			<div class="map-search-chrome__bar">
				<div class="map-search-chrome__bar-row">
					{#if mobile.current}
						<button
							type="button"
							class="map-search-chrome__back"
							class:map-search-chrome__back--visible={mobileSearchActive}
							aria-label="Close search"
							tabindex={mobileSearchActive ? 0 : -1}
							onmousedown={(event) => {
								event.preventDefault();
								dismissMobileSearch();
							}}
						>
							<ArrowLeft size={22} aria-hidden="true" />
						</button>
					{/if}
					<div class="map-search-chrome__pill-wrap">
						<div class="map-search-chrome__pill">
							<span
								class="search-icon"
								class:search-icon--hidden={mobileSearchActive}
								aria-hidden="true"
							>
								<SearchIcon size={20} />
							</span>
							<label class="sr-only" for="search">Search campus</label>
							<input
								type="text"
								role="searchbox"
								enterkeyhint="search"
								id="search"
								autocomplete="off"
								value={searchInfo.inputValue}
								bind:this={searchElement}
								oninput={handleInput}
								onfocus={() => {
									searchFocused = true;
								}}
								onblur={() => {
									searchFocused = false;
								}}
								aria-controls="search-suggestions"
								aria-autocomplete="list"
								aria-haspopup="listbox"
								placeholder="Keywords"
							/>
							{#if searchInfo.inputValue !== '' || searchInfo.category !== null}
								<button
									onclick={clearSearch}
									type="button"
									class="clear-btn"
									class:clear-btn--hidden={mobileSearchActive}
									aria-label={clearSelectionLabel}
									title={clearSelectionLabel}
									tabindex={mobileSearchActive ? -1 : 0}
								>
									<X />
								</button>
							{/if}
							<!-- {#if !mobile.current}
								<button
									type="button"
									class="map-search-chrome__add"
									aria-label="Add something to the map"
									onclick={() => editorChromeStore.openAdditionModal()}
								>
									<MapPinPlus size={14} aria-hidden="true" />
									<span>Add</span>
								</button>
							{/if} -->
						</div>
					</div>

					{#if !mobile.current && !searchFocused}
						<!-- <MapFilterChips /> -->
					{/if}

					<!-- {#if showEditorChrome}
						<button
							type="button"
							class="map-search-chrome__editor-btn"
							class:map-search-chrome__editor-btn--editing={mapEditStore.enabled}
							aria-haspopup="dialog"
							aria-label={editorOpenLabel}
							title={editorChipLabel}
							onclick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								openEditorTools();
							}}
						>
							<ShieldCheck size={18} aria-hidden="true" />
							{#if proposalsStore.pendingCount > 0}
								<span class="map-search-chrome__editor-badge" aria-hidden="true"
									>{proposalsStore.pendingCount}</span
								>
							{/if}
						</button>
					{/if} -->
				</div>
			</div>

			{#if mobile.current && !searchFocused}
				<div class="map-search-chrome__mobile-chips">
					<!-- <MapFilterChips /> -->
				</div>
			{/if}

			<!-- {#if showSearchDropdown}
				svelte-ignore a11y_interactive_supports_focus
				<div
					id="search-suggestions"
					class="map-search-chrome__suggestions"
					role="listbox"
					aria-label="Search suggestions"
					onmousedown={(event) => event.preventDefault()}
					in:fade={dropdownFadeIn(reducedMotion.current)}
					out:fade={dropdownFadeOut(reducedMotion.current)}
				>
				</div>
				{/if} -->

			<Suggestions />
		</div>
	</div>
</div>
