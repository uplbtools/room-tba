// src/lib/schedule-renderer.ts

type Course = {
  day: string;
  time: string;
  courseCode: string;
  section: string;
  color: string;
  groupKey?: string | null;
};

export class ScheduleRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  config = {
    width: 800,
    height: 450,
    headerHeight: 32,
    timeColumnWidth: 55,
    startHour: 7,
    endHour: 20,
    days: ["M", "T", "W", "Th", "F", "S"],
    colors: {
      background: "#FFFFFF",
      header: "hsl(5, 53%, 32%)",
      headerText: "#FFFFFF",
      grid: "hsl(5, 10%, 78%)",
      gridLight: "hsl(5, 10%, 85%)",
      timeColumn: "hsl(5, 53%, 28%)",
      timeText: "#FFFFFF",
    },
    fonts: {
      header: "bold 13px Inter, Arial, sans-serif",
      time: "12px Inter, Arial, sans-serif",
      course: "bold 12px Inter, Arial, sans-serif",
      section: "10px Inter, Arial, sans-serif",
    },
  };
  courses: Course[] = [];
  cellWidth: number = 0;
  cellHeight: number = 0;

  constructor(canvas: string | HTMLCanvasElement, config = {}) {
    if (typeof canvas === "string") {
      this.canvas = document.getElementById(canvas) as HTMLCanvasElement;
      if (!this.canvas) {
        throw new Error(`Canvas with id "${canvas}" not found`);
      }
    } else {
      this.canvas = canvas;
    }
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.config = { ...this.config, ...config };

    this.courses = [];
    this.init();
  }

  init() {
    // Responsive canvas for mobile schedule UX (#241)
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.min(
      this.config.width,
      this.canvas.clientWidth || this.config.width,
    );
    const cssHeight = Math.min(
      this.config.height,
      this.canvas.clientHeight || this.config.height,
    );
    this.canvas.width = cssWidth * dpr;
    this.canvas.height = cssHeight * dpr;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.ctx.scale(dpr, dpr);
    this.config.width = cssWidth;
    this.config.height = cssHeight;
    // Pull design tokens from CSS custom properties when available (#240).
    const root = getComputedStyle(document.documentElement);
    this.config.colors.background =
      root.getPropertyValue("--map-chrome-surface").trim() ||
      this.config.colors.background;
    this.config.colors.header =
      root.getPropertyValue("--map-chrome-border-accent").trim() ||
      this.config.colors.header;
    this.cellWidth =
      (this.config.width - this.config.timeColumnWidth) /
      this.config.days.length;
    this.cellHeight =
      (this.config.height - this.config.headerHeight) /
      (this.config.endHour - this.config.startHour);
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const cfg = this.config;

    ctx.fillStyle = cfg.colors.background;
    ctx.fillRect(0, 0, cfg.width, cfg.height);

    ctx.strokeStyle = cfg.colors.gridLight;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < cfg.endHour - cfg.startHour; i++) {
      const y = cfg.headerHeight + i * this.cellHeight + this.cellHeight / 2;
      ctx.beginPath();
      ctx.moveTo(cfg.timeColumnWidth, y);
      ctx.lineTo(cfg.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = cfg.colors.header;
    ctx.fillRect(0, 0, cfg.width, cfg.headerHeight);

    ctx.fillStyle = cfg.colors.timeColumn;
    ctx.fillRect(
      0,
      cfg.headerHeight,
      cfg.timeColumnWidth,
      cfg.height - cfg.headerHeight,
    );

    ctx.fillStyle = cfg.colors.headerText;
    ctx.font = cfg.fonts.header;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    cfg.days.forEach((day, i) => {
      const x = cfg.timeColumnWidth + i * this.cellWidth + this.cellWidth / 2;
      ctx.fillText(day, x, cfg.headerHeight / 2);
    });

    ctx.fillStyle = cfg.colors.timeText;
    ctx.font = cfg.fonts.time;
    ctx.textAlign = "center";

    for (let hour = cfg.startHour; hour < cfg.endHour; hour++) {
      const y =
        cfg.headerHeight +
        (hour - cfg.startHour) * this.cellHeight +
        this.cellHeight / 2;
      const displayHour = hour > 12 ? hour - 12 : hour;
      const _period = hour >= 12 ? "PM" : "AM";
      const label = `${displayHour}:00`;
      ctx.fillText(label, cfg.timeColumnWidth / 2, y);
    }

    ctx.strokeStyle = cfg.colors.grid;
    ctx.lineWidth = 1;

    for (let i = 0; i <= cfg.endHour - cfg.startHour; i++) {
      const y = cfg.headerHeight + i * this.cellHeight;
      ctx.beginPath();
      ctx.moveTo(cfg.timeColumnWidth, y);
      ctx.lineTo(cfg.width, y);
      ctx.stroke();
    }

    for (let i = 0; i <= cfg.days.length; i++) {
      const x = cfg.timeColumnWidth + i * this.cellWidth;
      ctx.beginPath();
      ctx.moveTo(x, cfg.headerHeight);
      ctx.lineTo(x, cfg.height);
      ctx.stroke();
    }

    this.courses.forEach((course) => this.drawCourse(course));
  }

  addCourse(course: Course) {
    this.courses.push(course);
    this.drawCourse(course);
  }

  drawCourse(course: Course) {
    const ctx = this.ctx;
    const cfg = this.config;

    const dayIndices = this.parseDays(course.day);
    const [startTime, endTime] = this.parseTime(course.time);

    if (!startTime || !endTime) {
      console.warn("Could not parse time:", course.time);
      return;
    }
    dayIndices.forEach((dayIndex) => {
      if (dayIndex < 0 || dayIndex >= cfg.days.length) return;

      const x = cfg.timeColumnWidth + dayIndex * this.cellWidth + 1;
      const y =
        cfg.headerHeight + (startTime - cfg.startHour) * this.cellHeight + 1;
      const width = this.cellWidth - 2;
      const height = (endTime - startTime) * this.cellHeight - 2;

      if (height <= 0) return;

      ctx.fillStyle = course.color || "#2E7D32";
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 2);
      ctx.fill();

      if (course.groupKey) {
        ctx.strokeStyle = "rgba(123, 17, 19, 0.55)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      const centerX = x + width / 2;
      const padding = 3;
      let textY = y + padding;

      ctx.font = cfg.fonts.course;
      const courseCode = this.truncateText(course.courseCode, width - 6);
      ctx.fillText(courseCode, centerX, textY);
      textY += 11;

      if (height > 28 && course.section) {
        ctx.font = cfg.fonts.section;
        const section = this.truncateText(course.section, width - 6);
        ctx.fillText(section, centerX, textY);
      }
    });
  }

  parseDays(dayStr: string) {
    return parseDays(dayStr);
  }

  parseTime(timeStr: string) {
    const match = timeStr.match(
      /^(\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?$/,
    );
    if (!match) {
      console.warn("Time parse failed:", timeStr);
      return [null, null];
    }

    let startHour = parseInt(match[1], 10);
    const startMin = match[2] ? parseInt(match[2], 10) : 0;
    let endHour = parseInt(match[3], 10);
    const endMin = match[4] ? parseInt(match[4], 10) : 0;

    if (startHour >= 1 && startHour <= 6) startHour += 12;
    if (endHour >= 1 && endHour <= 6) endHour += 12;
    if (endHour === 7 && startHour > 7) endHour += 12;

    const start = startHour + startMin / 60;
    const end = endHour + endMin / 60;

    return [start, end];
  }

  truncateText(text: string, maxWidth: number) {
    const ctx = this.ctx;
    if (!text) return "";
    if (ctx.measureText(text).width <= maxWidth) return text;

    let truncated = text;
    while (
      truncated.length > 0 &&
      ctx.measureText(`${truncated}..`).width > maxWidth
    ) {
      truncated = truncated.slice(0, -1);
    }
    return truncated.length > 0 ? `${truncated}..` : "";
  }

  clear() {
    this.courses = [];
    this.draw();
  }
}
const courseColors = [
  "#2E7D32",
  "#1565C0",
  "#6A1B9A",
  "#C62828",
  "#EF6C00",
  "#00838F",
  "#4527A0",
  "#AD1457",
  "#00695C",
  "#5D4037",
  "#37474F",
  "#1B5E20",
  "#0D47A1",
  "#4A148C",
  "#B71C1C",
] as const;

/** Map an AMIS day string ("MWF", "TTh", …) to indices 0-5 (M-S). */
export function parseDays(dayStr: string): number[] {
  const dayMap: { [key: string]: number } = { M: 0, T: 1, W: 2, F: 4, S: 5 };
  const indices: number[] = [];

  // Strip the Thursday token first so its T/H aren't mis-read as Tuesday.
  // AMIS/DB data mixes casing — seed uses "Th", production uses "TH".
  const str = dayStr.replace(/th/gi, () => {
    indices.push(3);
    return "";
  });

  for (const char of str.toUpperCase()) {
    if (Object.hasOwn(dayMap, char)) indices.push(dayMap[char]);
  }

  return Array.from(new Set(indices).values()).sort((a, b) => a - b);
}

export function parseScheduleTime(scheduleStr: string) {
  if (!scheduleStr || scheduleStr === "TBA") return null;

  const match = scheduleStr.match(
    /^([MTWThFSa]+)\s+(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );
  if (!match) return null;

  const days = match[1];
  let startHour = parseInt(match[2], 10);
  const startMin = parseInt(match[3], 10);
  const startPeriod = match[4].toUpperCase();
  let endHour = parseInt(match[5], 10);
  const endMin = parseInt(match[6], 10);
  const endPeriod = match[7].toUpperCase();

  if (startPeriod === "PM" && startHour !== 12) startHour += 12;
  if (startPeriod === "AM" && startHour === 12) startHour = 0;
  if (endPeriod === "PM" && endHour !== 12) endHour += 12;
  if (endPeriod === "AM" && endHour === 12) endHour = 0;

  const formattedStartHour =
    startHour > 12 ? startHour - 12 : startHour === 0 ? 12 : startHour;
  const formattedEndHour =
    endHour > 12 ? endHour - 12 : endHour === 0 ? 12 : endHour;

  const startStr =
    formattedStartHour +
    (startMin > 0 ? `:${String(startMin).padStart(2, "0")}` : "");
  const endStr =
    formattedEndHour +
    (endMin > 0 ? `:${String(endMin).padStart(2, "0")}` : "");

  return {
    days: days,
    time: `${startStr}-${endStr}`,
    // 24h minutes since midnight — exact, unlike parseTime's PM heuristic.
    startMinutes: startHour * 60 + startMin,
    endMinutes: endHour * 60 + endMin,
  };
}

export function getColorForCourse(courseCode: string) {
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  return courseColors[Math.abs(hash) % courseColors.length];
}

/**
 * Planner grid block color keyed on component type, not course: lectures,
 * labs, and recitations each read as one consistent kind at a glance (a hashed
 * per-course palette collided — different courses shared a color). Room-view
 * coloring still uses getColorForCourse.
 */
export function getPlannerBlockColor(type: string | null | undefined): string {
  switch ((type ?? "").trim().toUpperCase()) {
    case "LEC":
      return "#1565C0"; // blue — lecture
    case "LAB":
      return "#2E7D32"; // green — lab
    case "RCT":
      return "#EF6C00"; // amber — recitation
    default:
      return "#546E7A"; // slate — other (e.g. CPT)
  }
}
