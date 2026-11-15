import { sectionBlocks } from './conflicts.js';
import type { PlannedSection } from './types.js';
import { toManilaDateKey } from '#lib/utils/term/term-calendar.js';

export type AgendaEntry = {
	courseCode: string;
	section: string;
	type: string;
	roomCode: string | null;
	courseTitle: string | null;
	startMin: number;
	endMin: number;
	timeLabel: string;
};

export type AgendaDay = {
	dateKey: string;
	dayIndex: number | null;
	title: string;
	dateLabel: string;
	isToday: boolean;
	isWeekend: boolean;
	emptyLabel: string;
	entries: AgendaEntry[];
};

const WEEKDAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
] as const;

function keyToUtc(dateKey: string): Date {
	const [year, month, day] = dateKey.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day));
}

function addDays(dateKey: string, days: number): string {
	const date = keyToUtc(dateKey);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function formatClock(minutes: number): string {
	const hour24 = Math.floor(minutes / 60) % 24;
	const minute = minutes % 60;
	const period = hour24 >= 12 ? 'PM' : 'AM';
	const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
	return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatTimeRange(startMin: number, endMin: number): string {
	return `${formatClock(startMin)} – ${formatClock(endMin)}`;
}

export function buildAgenda(
	sections: PlannedSection[],
	options: { now?: Date; days?: number } = {}
): AgendaDay[] {
	const todayKey = toManilaDateKey(options.now ?? new Date());
	const dayCount = options.days ?? 7;

	const byDayIndex = new Map<number, AgendaEntry[]>();
	for (const section of sections) {
		if (section.stale) continue;
		for (const block of sectionBlocks(section)) {
			const entries = byDayIndex.get(block.dayIndex) ?? [];
			entries.push({
				courseCode: section.courseCode,
				section: section.section,
				type: section.type,
				roomCode: section.roomCode,
				courseTitle: section.courseTitle ?? null,
				startMin: block.startMin,
				endMin: block.endMin,
				timeLabel: formatTimeRange(block.startMin, block.endMin)
			});
			byDayIndex.set(block.dayIndex, entries);
		}
	}
	for (const entries of byDayIndex.values()) {
		entries.sort((a, b) => a.startMin - b.startMin || a.courseCode.localeCompare(b.courseCode));
	}

	return Array.from({ length: dayCount }, (_, offset) => {
		const dateKey = addDays(todayKey, offset);
		const weekday = keyToUtc(dateKey).getUTCDay();
		const dayIndex = weekday === 0 ? null : weekday - 1;
		const isToday = offset === 0;
		return {
			dateKey,
			dayIndex,
			title: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : WEEKDAY_NAMES[weekday],
			dateLabel: keyToUtc(dateKey).toLocaleDateString('en-PH', {
				month: 'short',
				day: 'numeric',
				timeZone: 'UTC'
			}),
			isToday,
			isWeekend: weekday === 0 || weekday === 6,
			emptyLabel:
				weekday === 0 ? 'No classes on Sundays.' : isToday ? 'No classes today.' : 'No classes.',
			entries: dayIndex === null ? [] : (byDayIndex.get(dayIndex) ?? [])
		};
	});
}
