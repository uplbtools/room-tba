const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileOptions = {
	allowUnconfigured?: boolean;
};

export function turnstileMayBeUnconfigured(env: {
	dev: boolean;
	flag: string | undefined;
}): boolean {
	return env.dev || env.flag === '1';
}

/**
 * Do not send `remoteip`: behind Vercel/CDN the forwarded IP often differs
 * from what Cloudflare issued the token for, and siteverify then fails even
 * when the widget shows Success.
 */
export async function verifyTurnstileToken(
	token: string | null | undefined,
	secret: string,
	options: TurnstileOptions = {}
): Promise<boolean> {
	const trimmedSecret = secret.trim();
	if (!trimmedSecret) {
		if (options.allowUnconfigured) return true;
		console.error(
			'Turnstile rejected: TURNSTILE_SECRET_KEY is not set. Set it, or TURNSTILE_ALLOW_UNCONFIGURED=1 outside production.'
		);
		return false;
	}
	if (!token) return false;

	try {
		const body = new URLSearchParams({
			secret: trimmedSecret,
			response: token
		});

		const res = await fetch(SITEVERIFY_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		});
		if (!res.ok) return false;
		const data = (await res.json()) as {
			success?: boolean;
			'error-codes'?: string[];
		};
		if (data.success === true) return true;
		console.error('Turnstile siteverify rejected token:', data['error-codes']);
		return false;
	} catch (error) {
		console.error('Turnstile siteverify failed:', error);
		return false;
	}
}
