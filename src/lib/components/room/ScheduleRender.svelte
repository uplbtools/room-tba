<script lang="ts">
	import {
		getPlannerBlockColor,
		parseDays,
		parseScheduleTime,
		ScheduleRenderer
	} from '#lib/utils/schedule-renderer.js';
	import { offeringGroupKey } from '#lib/utils/class-offering-groups.js';
	import type { ClassMapValue } from '#lib/utils/types.js';

	interface Props {
		roomCode: string;
		classes: ClassMapValue[];
	}
	const { roomCode, classes }: Props = $props();

	let canvasEl = $state<HTMLCanvasElement | undefined>();
	const NARROW_HOUR_HEIGHT = 44;

	$effect(() => {
		if (!canvasEl) return;

		const containerWidth = canvasEl.parentElement?.clientWidth ?? 320;
		const baseWidth = 1000;
		const narrow = containerWidth < 600;
		const width = Math.min(containerWidth, baseWidth);
		const headerHeight = 32;
		const hours = 13;
		const height = narrow
			? headerHeight + hours * NARROW_HOUR_HEIGHT
			: Math.round((600 * width) / baseWidth);

		const hasSaturday = classes.some((sectionClass) =>
			(sectionClass.schedule ?? []).some((schedStr) => {
				const parsed = parseScheduleTime(schedStr);
				return parsed ? parseDays(parsed.days).includes(5) : false;
			})
		);

		const renderer = new ScheduleRenderer(canvasEl, {
			width,
			height,
			headerHeight,
			timeColumnWidth: narrow ? 44 : 55,
			...(narrow && !hasSaturday ? { days: ['M', 'T', 'W', 'Th', 'F'] } : {})
		});

		classes.forEach((sectionClass) => {
			const schedule: string[] = sectionClass.schedule ?? [];
			if (schedule.length === 0) return;
			schedule.forEach((schedStr) => {
				const parsed = parseScheduleTime(schedStr);
				if (!parsed) {
					return;
				}
				const color = getPlannerBlockColor(sectionClass.type);
				const label =
					sectionClass.courseCode + (sectionClass.type ? ` (${sectionClass.type})` : '');

				renderer.addCourse({
					day: parsed.days,
					time: parsed.time,
					courseCode: label,
					section: sectionClass.section ?? '',
					color,
					groupKey: offeringGroupKey(sectionClass.courseCode, sectionClass.section)
				});
			});
		});
	});
</script>

<canvas bind:this={canvasEl} aria-label={`Class schedule for ${roomCode}`}></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		overflow: hidden;
		border-radius: 0.5rem;
	}
</style>
