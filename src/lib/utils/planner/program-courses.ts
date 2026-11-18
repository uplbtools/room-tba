import * as v from 'valibot';

export const PROGRAM_COURSES_URL = 'https://gradesim.uplb.tools/program-courses.json';
export const PLANNER_PROGRAM_KEY = 'rtba-planner-program';

const ProgramCoursesSchema = v.record(
	v.string(),
	v.object({ name: v.string(), courses: v.array(v.string()) })
);

export type Program = { code: string; name: string; courses: string[] };

/** GradeSim's programs sorted by name, with course codes in numeric order. [] when the file can't load. */
export async function fetchPrograms(): Promise<Program[]> {
	try {
		const response = await fetch(PROGRAM_COURSES_URL);
		if (!response.ok) return [];
		const data = v.safeParse(ProgramCoursesSchema, await response.json());
		if (!data.success) return [];
		return Object.entries(data.output)
			.map(([code, { name, courses }]) => ({
				code,
				name,
				courses: [...courses].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	} catch {
		return [];
	}
}
