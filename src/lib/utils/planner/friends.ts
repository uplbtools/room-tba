import { sectionBlocks } from './conflicts.js';
import { sectionNaturalKey, type PlannedSection } from './types.js';

export type FreeWindow = { dayIndex: number; startMin: number; endMin: number };

export type Person = { name: string; sections: PlannedSection[] };

/** Gaps of at least `minLength` minutes when nobody in the group has class. */
export function freeTogether(
	people: PlannedSection[][],
	{ fromMin = 7 * 60, toMin = 19 * 60, minLength = 30 } = {}
): FreeWindow[] {
	const busy = people.flatMap((sections) =>
		sections.filter((s) => !s.stale).flatMap(sectionBlocks)
	);
	const days = busy.some((b) => b.dayIndex === 5) ? 6 : 5;
	const windows: FreeWindow[] = [];
	for (let dayIndex = 0; dayIndex < days; dayIndex++) {
		let cursor = fromMin;
		const blocks = busy
			.filter((b) => b.dayIndex === dayIndex)
			.sort((a, b) => a.startMin - b.startMin);
		for (const block of [...blocks, { startMin: toMin, endMin: toMin }]) {
			const end = Math.min(block.startMin, toMin);
			if (end - cursor >= minLength) windows.push({ dayIndex, startMin: cursor, endMin: end });
			cursor = Math.max(cursor, block.endMin);
			if (cursor >= toMin) break;
		}
	}
	return windows;
}

/** Sections that two or more people in the group are taking. */
export function sharedSections(people: Person[]) {
	const byKey = new Map<string, PlannedSection & { names: string[] }>();
	for (const person of people) {
		for (const section of person.sections) {
			if (section.stale) continue;
			const key = sectionNaturalKey(section);
			const entry = byKey.get(key) ?? { ...section, names: [] };
			if (!entry.names.includes(person.name)) entry.names.push(person.name);
			byKey.set(key, entry);
		}
	}
	return [...byKey.values()].filter((entry) => entry.names.length > 1);
}
