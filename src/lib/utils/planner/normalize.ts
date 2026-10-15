/** Distinct, normalized room codes from planner sections. TBA rooms (null)
 * are dropped — they have no building to highlight. */
export function plannerRoomCodes(sections: { roomCode: string | null }[]): string[] {
	return [
		...new Set(
			sections
				.map((section) => section.roomCode?.trim().toUpperCase())
				.filter((code): code is string => !!code)
		)
	];
}
