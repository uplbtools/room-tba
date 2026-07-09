// Render a plan's weekly timetable to a PNG from the plan data itself — no DOM
// screenshot library. Reuses the same schedule parsers and block colors as the
// live grid, so the image matches what the planner shows and needs no new dep.

import {
  getPlannerBlockColor,
  parseDays,
  parseScheduleTime,
} from "@lib/schedule-renderer";
import type { PlannerPlan } from "./types";

export type PlanBlock = {
  day: number; // 0 = Mon … 5 = Sat
  start: number; // minutes since midnight
  end: number;
  code: string;
  section: string;
  type: string;
  room: string | null;
  color: string;
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Flatten a plan's scheduled sections into per-day/time blocks. */
export function planToBlocks(plan: PlannerPlan): PlanBlock[] {
  const blocks: PlanBlock[] = [];
  for (const s of plan.sections) {
    if (s.stale) continue;
    for (const entry of s.schedule ?? []) {
      const parsed = parseScheduleTime(entry);
      if (!parsed) continue;
      for (const day of parseDays(parsed.days ?? "")) {
        blocks.push({
          day,
          start: parsed.startMinutes,
          end: parsed.endMinutes,
          code: s.courseCode,
          section: s.section,
          type: s.type,
          room: s.roomCode,
          color: getPlannerBlockColor(s.type),
        });
      }
    }
  }
  return blocks;
}

/**
 * Pack overlapping blocks in one day into side-by-side columns so nothing draws
 * on top of anything else. Greedy interval colouring: each block takes the first
 * column whose last block already ended. Returns each block's column index and
 * the total column count for that day. Pure — this is the testable bit.
 */
export function packColumns(dayBlocks: PlanBlock[]): {
  columnOf: Map<PlanBlock, number>;
  columns: number;
} {
  const sorted = [...dayBlocks].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  );
  const columnEnds: number[] = []; // end time of the last block in each column
  const columnOf = new Map<PlanBlock, number>();
  for (const block of sorted) {
    let col = columnEnds.findIndex((end) => end <= block.start);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(block.end);
    } else {
      columnEnds[col] = block.end;
    }
    columnOf.set(block, col);
  }
  return { columnOf, columns: Math.max(1, columnEnds.length) };
}

/** Render the plan timetable to a PNG Blob (2× for retina). Browser-only. */
export async function renderPlanToPng(
  plan: PlannerPlan,
  opts: { termLabel?: string | null } = {},
): Promise<Blob> {
  const blocks = planToBlocks(plan);

  const usedDays = blocks.map((b) => b.day);
  const dayCount = Math.max(
    5,
    (usedDays.length ? Math.max(...usedDays) : 4) + 1,
  );

  let startHour = 7;
  let endHour = 19;
  if (blocks.length) {
    startHour = Math.min(
      7,
      Math.floor(Math.min(...blocks.map((b) => b.start)) / 60),
    );
    endHour = Math.max(
      18,
      Math.ceil(Math.max(...blocks.map((b) => b.end)) / 60),
    );
  }
  const hours = Math.max(1, endHour - startHour);

  // Geometry (CSS px; scaled up on the canvas for crispness).
  const scale = 2;
  const pad = 24;
  const titleH = 56;
  const headerH = 32;
  const gutterW = 56;
  const colW = 150;
  const hourH = 56;
  const width = pad * 2 + gutterW + colW * dayCount;
  const height = pad * 2 + titleH + headerH + hourH * hours;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.scale(scale, scale);

  // Background.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Title.
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "700 22px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(plan.label, pad, pad);
  if (opts.termLabel) {
    ctx.fillStyle = "#6b6b6b";
    ctx.font = "500 14px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${opts.termLabel} · Room TBA`, pad, pad + 28);
  } else {
    ctx.fillStyle = "#6b6b6b";
    ctx.font = "500 14px system-ui, -apple-system, sans-serif";
    ctx.fillText("Room TBA", pad, pad + 28);
  }

  const gridTop = pad + titleH;
  const gridLeft = pad + gutterW;

  // Day headers.
  ctx.textAlign = "center";
  ctx.font = "600 14px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#333";
  for (let d = 0; d < dayCount; d++) {
    ctx.fillText(
      DAY_NAMES[d] ?? "",
      gridLeft + colW * d + colW / 2,
      gridTop + 8,
    );
  }

  const bodyTop = gridTop + headerH;

  // Hour rows + labels.
  ctx.strokeStyle = "#e6e6e6";
  ctx.lineWidth = 1;
  ctx.textAlign = "right";
  ctx.font = "500 12px system-ui, -apple-system, sans-serif";
  for (let h = 0; h <= hours; h++) {
    const y = bodyTop + hourH * h;
    ctx.beginPath();
    ctx.moveTo(gridLeft, y);
    ctx.lineTo(gridLeft + colW * dayCount, y);
    ctx.stroke();
    if (h < hours) {
      const hour24 = startHour + h;
      const label = `${((hour24 + 11) % 12) + 1} ${hour24 < 12 ? "AM" : "PM"}`;
      ctx.fillStyle = "#8a8a8a";
      ctx.fillText(label, gridLeft - 8, y + 4);
    }
  }
  // Vertical day separators.
  for (let d = 0; d <= dayCount; d++) {
    const x = gridLeft + colW * d;
    ctx.beginPath();
    ctx.moveTo(x, bodyTop);
    ctx.lineTo(x, bodyTop + hourH * hours);
    ctx.stroke();
  }

  // Blocks, packed per day so overlaps sit side by side.
  const minY = startHour * 60;
  ctx.textAlign = "left";
  for (let d = 0; d < dayCount; d++) {
    const dayBlocks = blocks.filter((b) => b.day === d);
    const { columnOf, columns } = packColumns(dayBlocks);
    const subW = colW / columns;
    for (const block of dayBlocks) {
      const col = columnOf.get(block) ?? 0;
      const x = gridLeft + colW * d + subW * col + 2;
      const y = bodyTop + ((block.start - minY) / 60) * hourH + 1;
      const w = subW - 4;
      const bh = Math.max(18, ((block.end - block.start) / 60) * hourH - 2);

      ctx.fillStyle = block.color;
      roundRect(ctx, x, y, w, bh, 6);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 12px system-ui, -apple-system, sans-serif";
      clipText(ctx, `${block.code}`, x + 6, y + 5, w - 8);
      ctx.font = "500 11px system-ui, -apple-system, sans-serif";
      clipText(ctx, `${block.type} ${block.section}`, x + 6, y + 20, w - 8);
      if (block.room && bh > 48) {
        clipText(ctx, block.room, x + 6, y + 34, w - 8);
      }
    }
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Draw text truncated with an ellipsis to fit maxWidth. */
function clipText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  ctx.fillText(`${t}…`, x, y);
}
