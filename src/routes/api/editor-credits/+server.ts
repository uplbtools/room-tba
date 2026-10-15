import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// Inlined from astro editor-credits-service getEditorCredits: public,
	// intentionally minimal credit roster; [] on failure (requires migration 0033).
	let credits: {
		name: string;
		avatarUrl: string | null;
		profileUrl: string | null;
	}[];
	try {
		const rows = await db.execute(sql`
      WITH editor_activity AS (
        SELECT u.id AS user_id, max(h.created_at) AS last_activity
        FROM admin_users u
        JOIN editor_history h ON h.edited_by = u.username
          OR h.edited_by = COALESCE(u.display_name, u.username)
        GROUP BY u.id
      ), contribution_activity AS (
        SELECT user_id, max(created_at) AS last_activity
        FROM contributions
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      )
      SELECT
        COALESCE(u.display_name, u.username) AS name,
        u.avatar_url AS "avatarUrl",
        u.profile_url AS "profileUrl",
        GREATEST(e.last_activity, c.last_activity) AS last_activity
      FROM admin_users u
      LEFT JOIN editor_activity e ON e.user_id = u.id
      LEFT JOIN contribution_activity c ON c.user_id = u.id
      WHERE u.show_in_credits = true
        AND (
          u.legacy_credit = true
          OR (u.is_active = true AND (e.user_id IS NOT NULL OR c.user_id IS NOT NULL))
        )
      ORDER BY last_activity DESC NULLS LAST, name ASC
    `);
		credits = Array.from(rows as Iterable<Record<string, unknown>>).map((row) => ({
			name: String(row.name),
			avatarUrl: typeof row.avatarUrl === 'string' ? row.avatarUrl : null,
			profileUrl: typeof row.profileUrl === 'string' ? row.profileUrl : null
		}));
	} catch (e) {
		// Rolling deploys can serve this before the additive migration lands.
		console.error('Could not load editor credits:', e);
		credits = [];
	}

	return new Response(JSON.stringify(credits), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=300'
		}
	});
};
