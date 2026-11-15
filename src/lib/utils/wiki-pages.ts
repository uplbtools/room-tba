import { GITHUB_ROOM_TBA_URL } from '#lib/constants/content/links/community.js';

export type WikiPage = {
	path: string;
	title: string;
	kicker: string;
	blurb: string;
	sourcePath: string;
};

export const WIKI_INDEX_PATH = '/wiki';

export const WIKI_PAGES: readonly WikiPage[] = [
	{
		path: '/wiki/using-room-tba',
		title: 'Finding a room, a class, or a way across campus',
		kicker: 'How-to',
		blurb:
			'Look up a room or class, plan a week and save the map for offline use, step by step. It also points to the official sources for enrollment, grades and the academic calendar.',
		sourcePath: 'src/routes/(app)/wiki/using-room-tba/+page.svelte'
	},
	{
		path: '/wiki/glossary',
		title: 'UPLB glossary: TBA, LH, AB, CAS and more',
		kicker: 'Glossary',
		blurb:
			'These are the abbreviations on schedules, room signs and building names, from AMIS and CRS to the college acronyms and room-code prefixes.',
		sourcePath: 'src/routes/(app)/wiki/glossary/+page.svelte'
	},
	{
		path: '/wiki/jeepney-guide',
		title: 'Jeepneys and buses around UPLB',
		kicker: 'Getting around',
		blurb:
			'This covers the campus routes, their stops, fares and boarding tips, read from the same data the map uses.',
		sourcePath: 'src/routes/(app)/wiki/jeepney-guide/+page.svelte'
	},
	{
		path: '/wiki/emergency-hotlines',
		title: 'Emergency hotlines around UPLB',
		kicker: 'Emergency contacts',
		blurb:
			'These contacts for campus security, local responders and nearby medical services work offline.',
		sourcePath: 'src/routes/(app)/wiki/emergency-hotlines/+page.svelte'
	},
	{
		path: '/wiki/campus-curfew',
		title: 'Campus curfew and dorm permits',
		kicker: 'Dorm guide',
		blurb:
			'This gives curfew hours and return-permit guidance for residents of UP-managed dormitories.',
		sourcePath: 'src/routes/(app)/wiki/campus-curfew/+page.svelte'
	},
	{
		path: '/wiki/section-times',
		title: 'What times do UPLB section names correspond to?',
		kicker: 'Class schedules',
		blurb:
			'This glossary covers letter ladders, NSTP/HK/GI/residency, MS/PhD numbers and every AMIS type. It also shows term trends from oldest to newest (what moved and what only looks bigger in Room TBA).',
		sourcePath: 'src/routes/(app)/wiki/section-times/+page.svelte'
	},
	{
		path: '/wiki/upcat-at-uplb',
		title: 'Taking the UPCAT at UP Los Baños',
		kicker: 'UPCAT at UPLB',
		blurb:
			"This first-timer's guide to the UPCAT at UPLB covers what the test permit does and doesn't tell you, what to bring and how to save the campus map before mobile data gets congested. It was written for the August 2026 exam.",
		sourcePath: 'src/routes/(app)/wiki/upcat-at-uplb/+page.svelte'
	},
	{
		path: '/wiki/fork-for-your-campus',
		title: 'Fork this for your campus',
		kicker: 'For other campuses',
		blurb:
			'Room TBA is built for UPLB. This is what you replace to run it for a different campus, from the UPLB data and glue to rip out and the config to repoint to the parts you write yourself (class import).',
		sourcePath: 'src/routes/(app)/wiki/fork-for-your-campus/+page.svelte'
	}
] as const;

export const WIKI_PATHS: readonly string[] = [
	WIKI_INDEX_PATH,
	...WIKI_PAGES.map((page) => page.path)
];

export const WIKI_REPO_URL = GITHUB_ROOM_TBA_URL;

export function wikiCorrectionUrl(pageTitle: string, path: string): string {
	const params = new URLSearchParams({
		title: `Wiki correction: ${pageTitle}`,
		body: `Page: https://room-tba.uplb.tools${path}\n\nWhat is wrong:\n\nWhat it should say (with a source if you have one):\n`
	});
	return `${WIKI_REPO_URL}/issues/new?${params.toString()}`;
}
