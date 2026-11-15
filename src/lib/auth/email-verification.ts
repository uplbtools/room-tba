export const EMAIL_VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60;

export type EmailVerifyTokenPayload = {
	purpose: 'email-verify';
	userId: number;
	email: string;
};

export function parseEmailVerifyToken(payload: unknown): EmailVerifyTokenPayload | null {
	if (!payload || typeof payload !== 'object') return null;
	const candidate = payload as Partial<EmailVerifyTokenPayload>;
	if (
		candidate.purpose !== 'email-verify' ||
		!Number.isInteger(candidate.userId) ||
		typeof candidate.email !== 'string' ||
		!candidate.email.includes('@')
	) {
		return null;
	}
	return {
		purpose: 'email-verify',
		userId: candidate.userId as number,
		email: candidate.email.toLowerCase()
	};
}

export function verifyEmailUrl(siteUrl: string, token: string): string {
	return `${siteUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildVerificationEmail(input: {
	siteUrl: string;
	token: string;
	username: string;
}): { subject: string; text: string } {
	return {
		subject: 'Confirm your Room TBA email',
		text: [
			`Hi ${input.username},`,
			'',
			'Confirm this address for your Room TBA account so you can reset your password and hear back about your suggested edits:',
			'',
			verifyEmailUrl(input.siteUrl, input.token),
			'',
			"This link works once and expires in 24 hours. If you didn't create a Room TBA account, ignore this email and the address stays unlinked."
		].join('\n')
	};
}
