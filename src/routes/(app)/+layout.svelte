<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	// import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import '../styles/font-face.css';
	import '../styles/global.css';
	import '../styles/app-loading.css';
	// #716: emitted as a standalone asset (never bundled into the main CSS) so
	// mobile viewports can skip downloading it entirely — see the matchMedia
	// block below and the `desktop-only-css` runtimeCaching rule in vite.config.
	// import desktopOnlyUrl from '../styles/desktop-only.css?url';
	import SeoHead from '#lib/components/seo/SeoHead.svelte';
	import type { SeoData } from '#lib/components/seo/seo-data.js';
	import {
		breadcrumbSchema,
		DEFAULT_OG_IMAGE,
		jsonLd,
		webpageSchema,
		websiteSchema
	} from '#lib/utils/site.js';
	import {
		MapStore,
		MapToolsStore,
		MeasureRouteStore,
		TerrainStore,
		TravelTimeStore
	} from '#lib/stores/new/map/map-stores.svelte.js';
	import FloatingControlPanelStore from '#lib/stores/new/ui/FloatingControlPanelStore.svelte.js';
	import UserLocation from '#lib/stores/new/map/UserLocation.svelte.js';
	import OfflineStore from '#lib/stores/new/data/OfflineStore.svelte.js';
	import AnnouncementsStore from '#lib/stores/new/data/AnnouncementsStore.svelte.js';
	import SavedPlacesStore from '#lib/stores/new/data/SavedPlacesStore.svelte.js';
	import {
		initMapStore,
		initTravelTimeStore,
		initMapToolsStore,
		initMeasureRouteStore,
		initTerrainStore,
		initFloatingControlPanelStore,
		initSearchInfo,
		initModalStore,
		initUserLocation,
		initTermStore,
		initPlannerStore,
		initAdminAuthStore,
		initProposalsStore,
		initOfflineStore,
		initAnnouncementsStore,
		initSavedPlacesStore,
		getToast,
		initEscapeActions,
		initToast
	} from '#lib/utils/context.js';
	import SearchInfo from '#lib/stores/SearchInfo.svelte.js';
	import Toast from '#lib/components/Toast.svelte';
	import ModalStore from '#lib/stores/new/ui/ModalStore.svelte.js';
	import TermStore from '#lib/stores/new/data/TermStore.svelte.js';
	import DesktopTopBar from '#lib/components/map-chrome/DesktopTopBar.svelte';
	import PlannerStore from '#lib/stores/new/data/PlannerStore.svelte.js';
	import AdminAuthStore from '#lib/stores/new/data/AdminAuthStore.svelte.js';
	import ProposalsStore from '#lib/stores/new/data/ProposalsStore.svelte.js';
	import Modal from '#lib/components/new/Modal.svelte';
	import AdminLoginModal from '#lib/components/AdminLoginModal.svelte';
	import AccountSettingsModal from '#lib/components/AccountSettingsModal.svelte';
	import ManageUsersModal from '#lib/components/modal/ManageUsersModal.svelte';
	import ToastStore from '#lib/stores/new/ui/ToastStore.svelte.js';
	import EscapeActions from '#lib/stores/new/ui/EscapeActionStack.svelte.js';

	const { children }: { children: Snippet } = $props();

	const HOME_TITLE = 'Room TBA | Find Rooms, Dorms, Buildings, Colleges, and Divisions at UPLB';
	const HOME_DESCRIPTION =
		'Search rooms, dorms, and buildings at UPLB, then plan your classes. Campus data caches locally for spotty Wi-Fi.';

	const HOME_SEO: SeoData = {
		title: HOME_TITLE,
		ogTitle: 'Find Rooms, Dorms, Buildings, Colleges, and Divisions at UPLB',
		description: HOME_DESCRIPTION,
		canonicalPath: '/',
		imagePath: DEFAULT_OG_IMAGE,
		structuredData: jsonLd(
			websiteSchema(),
			webpageSchema({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: '/' }),
			breadcrumbSchema([{ name: 'Home', path: '/' }])
		)
	};

	// Entity routes return their own metadata from `load`; everything else in the
	// group is the app itself and keeps the home card.
	const seo = $derived(page.data.seo ?? HOME_SEO);
	const isMapRoute = $derived(page.route.id?.startsWith('/(app)/map'));

	// #716: the desktop/mobile split is viewport-based (not User-Agent), so the
	// same check works for every render path — SSR, prerendered shell, and
	// client-side navigation — without varying cached HTML per request. Runs at
	// component init (before the tree paints), and the change listener keeps it
	// live across resizes and devtools responsive mode.
	// if (browser) {
	// 	const html = document.documentElement;
	// 	const mql = window.matchMedia('(min-width: 48.0625rem)');
	// 	let link: HTMLLinkElement | null = null;

	// 	const apply = (isDesktop: boolean) => {
	// 		html.classList.toggle('desktop', isDesktop);
	// 		html.classList.toggle('mobile', !isDesktop);
	// 		if (isDesktop && !link) {
	// 			link = document.createElement('link');
	// 			link.rel = 'stylesheet';
	// 			link.href = desktopOnlyUrl;
	// 			document.head.appendChild(link);
	// 		} else if (!isDesktop && link) {
	// 			link.remove();
	// 			link = null;
	// 		}
	// 	};

	// 	apply(mql.matches);
	// 	mql.addEventListener('change', (event) => {
	// 		apply(event.matches);
	// 	});
	// }
	initToast(new ToastStore());
	initEscapeActions(new EscapeActions());
	initMapStore(new MapStore());
	initTravelTimeStore(new TravelTimeStore());
	initMapToolsStore(new MapToolsStore());
	initMeasureRouteStore(new MeasureRouteStore());
	initTerrainStore(new TerrainStore());
	initFloatingControlPanelStore(new FloatingControlPanelStore());
	initUserLocation(new UserLocation());
	initSearchInfo(new SearchInfo());
	initOfflineStore(new OfflineStore());
	const announcementsStore = initAnnouncementsStore(new AnnouncementsStore());
	const savedPlacesStore = initSavedPlacesStore(new SavedPlacesStore());
	const modalStore = initModalStore(new ModalStore());
	const termStore = initTermStore(new TermStore());
	const plannerStore = initPlannerStore(new PlannerStore(() => termStore.activeTermId));
	const proposalsStore = initProposalsStore(new ProposalsStore(() => adminAuthStore.canReview));
	const adminAuthStore = initAdminAuthStore(
		new AdminAuthStore({ modalStore, plannerStore, proposalsStore })
	);
	const toastStore = getToast();

	const ACCOUNT_ERRORS: Record<string, string> = {
		missing_token: 'That confirmation link is missing its token.',
		invalid_or_expired_token:
			'That confirmation link is invalid or has expired. Request a new one.',
		not_logged_in: 'Sign in first, then connect Google from account settings.',
		missing_code: 'Google sign-in was cancelled or incomplete. Try again.',
		oauth_failed: 'Connecting Google failed. Try again.',
		already_linked: 'That Google account is already connected to a different Room TBA account.'
	};

	function openFromUrl(params: URLSearchParams) {
		const authError = params.get('auth_error');
		if (authError) adminAuthStore.oauthError = authError;
		if (authError || params.get('editor') === 'login') adminAuthStore.openLogin();

		const account = params.get('account');
		const accountError = params.get('account_error');
		if (account === 'email-changed') toastStore.show('Email address updated.', 'success');
		if (account === 'google-linked') toastStore.show('Google account connected.', 'success');
		if (accountError) {
			toastStore.show(ACCOUNT_ERRORS[accountError] ?? 'Something went wrong. Try again.', 'error');
		}
		if (account || accountError) adminAuthStore.openAccountSettings();
	}

	onMount(() => {
		void termStore.init();
		announcementsStore.hydrate();
		savedPlacesStore.hydrate();
		plannerStore.init();
		void adminAuthStore.hydrate();

		const keys = ['editor', 'auth_error', 'account', 'account_error'];
		const url = new URL(page.url.href);
		if (!keys.some((key) => url.searchParams.has(key))) return;
		openFromUrl(url.searchParams);
		for (const key of keys) url.searchParams.delete(key);
		replaceState(url, page.state);
	});
</script>

<SeoHead {seo} />

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="48x48" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
	<meta name="theme-color" content="#a30e00" />

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap"
		rel="stylesheet"
	/>

	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<div class={isMapRoute ? 'flex h-dvh min-h-0 flex-col' : undefined}>
	{#if isMapRoute}
		<div class="relative z-30 hidden shrink-0 sm:block">
			<DesktopTopBar />
		</div>
	{/if}
	<div class={isMapRoute ? 'relative min-h-0 flex-1 overflow-auto' : undefined}>
		<svelte:boundary>
			{@render children()}
			{#snippet failed(error, reset)}
				{String(error)}
			{/snippet}
		</svelte:boundary>
	</div>
	<Modal />
	{#if adminAuthStore.loginOpen}
		<AdminLoginModal />
	{/if}
	{#if adminAuthStore.accountSettingsOpen}
		<AccountSettingsModal />
	{/if}
	{#if adminAuthStore.manageUsersOpen}
		<ManageUsersModal />
	{/if}
	<Toast />
</div>
<!--
<Layout
	{title}
	ogTitle="Find Rooms, Dorms, Buildings, Colleges, and Divisions at UPLB"
	{description}
	canonicalPath="/"
	{structuredData}
>
</Layout>
<style>
	.directions-status {
		position: fixed;
		bottom: 0.5rem;
		left: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		border-radius: 1rem;
		box-shadow: 0 2px 0.5rem 0 hsla(0, 0%, 0%, 0.2);
		background-color: white;
		width: min(20rem, calc(100% - (2 * 0.5rem)));
		font-size: 0.875rem;
		z-index: 20;

		.directions-header {
			font-weight: 600;
			font-size: 1rem;
		}
		.directions-body {
			display: flex;
			gap: 0.5rem;
			align-items: center;
		}
		.directions-progressbar {
			height: 0.75rem;
			flex: 1 0 0;
			border-radius: 0.5rem;
			background-color: hsl(0, 0%, 89%);
		}
		.directions-progressbar__value {
			position: relative;
			width: calc(attr(data-value number) * 1%);
			height: 100%;
			border-radius: 0.5rem;
			background-color: hsl(135, 100%, 42%);
		}
		a {
			display: inline-block;
			text-decoration: unset;
			padding: 0.25rem 0.75rem;
			border-radius: 0.5rem;
			transition: background-color 0.175s;
			background-color: hsl(5, 53%, 42%);
			&:hover {
				background-color: hsl(5, 53%, 37%);
			}
			&:active {
				background-color: hsl(5, 53%, 32%);
			}
			color: white;
		}
	}
</style> -->
