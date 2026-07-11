<script lang="ts">
  import {
    getPlannerBlockColor,
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

  $effect(() => {
    if (!canvasEl) return;

    // Scale renderer to container so text stays readable at 320px (#241)
    const containerWidth = canvasEl.parentElement?.clientWidth ?? 320;
    const baseWidth = 1000;
    const scale = Math.min(1, containerWidth / baseWidth);
    const width = Math.round(baseWidth * scale);
    const height = Math.round(600 * scale);

    const renderer = new ScheduleRenderer(canvasEl, {
      width,
      height,
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
    width: 100%;
    aspect-ratio: 10/6;
    overflow: hidden;
    border-radius: 0.5rem;
  }
</style>
