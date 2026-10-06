<script lang="ts">
  import {
    getPlannerBlockColor,
    parseDays,
    parseScheduleTime,
    ScheduleRenderer,
  } from "@lib/schedule-renderer";
  import { offeringGroupKey } from "@lib/class-offering-groups";
  import type { ClassMapValue } from "@lib/types";

  interface Props {
    roomCode: string;
    classes: ClassMapValue[];
  }
  const { roomCode, classes }: Props = $props();

  let canvasEl = $state<HTMLCanvasElement | undefined>();
  /** Room for two to three label lines in an hour-long class. */
  const NARROW_HOUR_HEIGHT = 44;

  $effect(() => {
    if (!canvasEl) return;

    // Wide containers keep the 10:6 grid. Phones get a full-width grid with
    // a fixed, readable hour height instead: shrinking 1000x600 to fit 340px
    // left ~13px per hour and cut every class to "VME..". The modal body
    // scrolls, so the taller grid is fine (#241).
    const containerWidth = canvasEl.parentElement?.clientWidth ?? 320;
    const baseWidth = 1000;
    const narrow = containerWidth < 600;
    const width = Math.min(containerWidth, baseWidth);
    const headerHeight = 32;
    const hours = 13;
    const height = narrow
      ? headerHeight + hours * NARROW_HOUR_HEIGHT
      : Math.round((600 * width) / baseWidth);

    // An empty Saturday column costs a phone a sixth of its width.
    const hasSaturday = classes.some((sectionClass) =>
      (sectionClass.schedule ?? []).some((schedStr) => {
        const parsed = parseScheduleTime(schedStr);
        return parsed ? parseDays(parsed.days).includes(5) : false;
      }),
    );

    const renderer = new ScheduleRenderer(canvasEl, {
      width,
      height,
      headerHeight,
      timeColumnWidth: narrow ? 44 : 55,
      ...(narrow && !hasSaturday ? { days: ["M", "T", "W", "Th", "F"] } : {}),
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
          sectionClass.courseCode +
          (sectionClass.type ? ` (${sectionClass.type})` : "");

        renderer.addCourse({
          day: parsed.days,
          time: parsed.time,
          courseCode: label,
          section: sectionClass.section,
          color,
          groupKey: offeringGroupKey(
            sectionClass.courseCode,
            sectionClass.section,
          ),
        });
      });
    });
  });
</script>

<canvas bind:this={canvasEl} aria-label={`Class schedule for ${roomCode}`}
></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    overflow: hidden;
    border-radius: 0.5rem;
  }
</style>
