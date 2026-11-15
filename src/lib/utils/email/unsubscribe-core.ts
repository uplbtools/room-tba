export type EmailTopic = 'digest' | 'review_notices';

export const EMAIL_TOPIC_LABELS: Record<EmailTopic, string> = {
	digest: 'the daily review digest',
	review_notices: 'review notices about suggested edits'
};

export type UnsubscribeTokenPayload = {
	purpose: 'unsubscribe';
	userId: number;
	topic: EmailTopic;
};

export function parseUnsubscribeToken(payload: unknown): UnsubscribeTokenPayload | null {
	if (!payload || typeof payload !== 'object') return null;
	const candidate = payload as Partial<UnsubscribeTokenPayload>;
	if (
		candidate.purpose !== 'unsubscribe' ||
		!Number.isInteger(candidate.userId) ||
		(candidate.topic !== 'digest' && candidate.topic !== 'review_notices')
	) {
		return null;
	}
	return { purpose: 'unsubscribe', userId: candidate.userId as number, topic: candidate.topic };
}

export function unsubscribeFooter(topic: EmailTopic, siteUrl: string, token: string): string {
	const url = `${siteUrl.replace(/\/$/, '')}/unsubscribe?token=${encodeURIComponent(token)}`;
	return ['', '--', `To stop receiving ${EMAIL_TOPIC_LABELS[topic]}, open ${url}`].join('\n');
}
