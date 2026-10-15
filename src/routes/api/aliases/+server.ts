import { and, eq, like, or } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { aliasesTable, buildingsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

// Inlined from astro src/lib/site.ts normalizeAlias (#155): NFKD, lowercase,
// strip everything that is not a letter or digit.
const normalizeAlias = (value: string) =>
	value
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');

export const GET: RequestHandler = async ({ url }) => {
	if (url.searchParams.get('export') === 'all') {
		// Inlined from astro map-data-service listAliasesForCache: [] on failure.
		try {
			const rows = await db
				.select({
					id: aliasesTable.id,
					alias: aliasesTable.alias,
					normalizedAlias: aliasesTable.normalizedAlias,
					targetType: aliasesTable.targetType,
					targetId: aliasesTable.targetId,
					buildingName: buildingsTable.buildingName
				})
				.from(aliasesTable)
				.leftJoin(
					buildingsTable,
					and(eq(aliasesTable.targetType, 'building'), eq(buildingsTable.id, aliasesTable.targetId))
				);
			const data = rows.map((row) => ({
				id: row.id,
				alias: row.alias,
				normalizedAlias: row.normalizedAlias,
				targetType: row.targetType,
				targetId: row.targetId,
				value: row.buildingName
			}));
			return new Response(JSON.stringify({ data, success: true }), {
				headers: { 'content-type': 'application/json' }
			});
		} catch (e) {
			console.error('Error: ', e);
			return new Response(JSON.stringify({ data: [], success: true }), {
				headers: { 'content-type': 'application/json' }
			});
		}
	}

	const q = url.searchParams.get('q') ?? '';
	if (q.trim() === '') {
		return new Response(JSON.stringify({ data: [], success: true }), {
			headers: { 'content-type': 'application/json' }
		});
	}

	// Inlined from astro map-data-service searchAliases (#155): exact and prefix
	// normalized-alias matches, exact first, deduped by target; [] on failure.
	try {
		const normalized = normalizeAlias(q);
		if (!normalized) {
			return new Response(JSON.stringify({ data: [], success: true }), {
				headers: { 'content-type': 'application/json' }
			});
		}
		const rows = await db
			.select({
				alias: aliasesTable.alias,
				normalizedAlias: aliasesTable.normalizedAlias,
				targetType: aliasesTable.targetType,
				targetId: aliasesTable.targetId,
				buildingName: buildingsTable.buildingName
			})
			.from(aliasesTable)
			.leftJoin(
				buildingsTable,
				and(eq(aliasesTable.targetType, 'building'), eq(buildingsTable.id, aliasesTable.targetId))
			)
			.where(
				or(
					eq(aliasesTable.normalizedAlias, normalized),
					like(aliasesTable.normalizedAlias, `${normalized}%`)
				)
			)
			.limit(12);

		// Exact matches first, then dedupe by target.
		rows.sort((a, b) => {
			const ae = a.normalizedAlias === normalized ? 0 : 1;
			const be = b.normalizedAlias === normalized ? 0 : 1;
			return ae - be;
		});
		const seen = new Set<string>();
		const matches: {
			alias: string;
			targetType: string;
			targetId: number;
			value: string | null;
		}[] = [];
		for (const row of rows) {
			const key = `${row.targetType}:${row.targetId}`;
			if (seen.has(key)) continue;
			seen.add(key);
			matches.push({
				alias: row.alias,
				targetType: row.targetType,
				targetId: row.targetId,
				value: row.buildingName
			});
		}
		return new Response(JSON.stringify({ data: matches, success: true }), {
			headers: { 'content-type': 'application/json' }
		});
	} catch (e) {
		console.error('Error: ', e);
		return new Response(JSON.stringify({ data: [], success: true }), {
			headers: { 'content-type': 'application/json' }
		});
	}
};
