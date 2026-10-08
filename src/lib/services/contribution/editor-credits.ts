import { db } from '$lib/utils/db';
import { sql } from 'drizzle-orm';
import { resolveContributorAttribution } from './contributor-profile';

export type EditorCredit = {
	name: string;
	avatarUrl: string | null;
	href: string | null;
};

/** Public, intentionally minimal credit roster. Requires contributor profile migration. */
export async function getEditorCredits(): Promise<EditorCredit[]> {
	try {
		const result = await db.execute(sql`
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
        u.id AS "userId",
        COALESCE(u.display_name, u.username) AS name,
        GREATEST(e.last_activity, c.last_activity) AS last_activity
      FROM admin_users u
      LEFT JOIN editor_activity e ON e.user_id = u.id
      LEFT JOIN contribution_activity c ON c.user_id = u.id
      WHERE u.show_in_credits = true
        AND (
          u.legacy_credit = true
          OR (u.is_active = true AND (e.user_id IS NOT NULL OR c.user_id IS NOT NULL))
        )
      ORDER BY last_activity DESC NULLS LAST, COALESCE(u.display_name, u.username) ASC
    `);
		const rows = result.rows as Array<{ userId?: unknown; name?: unknown }>;
		return await Promise.all(
			rows.map(async (row) => {
				const userId = typeof row.userId === 'number' ? row.userId : Number(row.userId);
				const attribution = Number.isSafeInteger(userId)
					? await resolveContributorAttribution(userId)
					: null;
				return (
					attribution ?? {
						name: typeof row.name === 'string' ? row.name : 'Contributor',
						avatarUrl: null,
						href: null
					}
				);
			})
		);
	} catch (error) {
		// Rolling deploys can serve this before the additive migration lands.
		console.error('Could not load editor credits:', error);
		return [];
	}
}
