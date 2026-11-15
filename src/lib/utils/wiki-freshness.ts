export const UPCAT_EXAM_LAST_DAY = '2026-08-02';

export function hasDayPassed(isoDay: string, now: Date = new Date()): boolean {
	const endOfDay = Date.parse(`${isoDay}T23:59:59.999+08:00`);
	if (Number.isNaN(endOfDay)) throw new Error(`Bad date: ${isoDay}`);
	return now.getTime() > endOfDay;
}

export function formatLongDay(isoDay: string): string {
	return new Intl.DateTimeFormat('en-PH', {
		dateStyle: 'long',
		timeZone: 'Asia/Manila'
	}).format(new Date(`${isoDay}T12:00:00+08:00`));
}
