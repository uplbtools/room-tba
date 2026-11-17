/** GradeSim's checklist courses per program, keyed by GradeSim's program code. */
export const PROGRAM_COURSES_URL =
  "https://gradesim.uplb.tools/program-courses.json";
export const PLANNER_PROGRAM_KEY = "rtba-planner-program";

export type Program = { code: string; name: string; courses: string[] };

/** Programs from the GradeSim file, sorted by name; [] when it can't load. */
export async function fetchPrograms(): Promise<Program[]> {
  try {
    const response = await fetch(PROGRAM_COURSES_URL);
    if (!response.ok) return [];
    const data = (await response.json()) as Record<string, unknown>;
    return Object.entries(data)
      .flatMap(([code, entry]) => {
        const { name, courses } = (entry ?? {}) as Partial<Program>;
        return typeof name === "string" && Array.isArray(courses)
          ? [{ code, name, courses }]
          : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
