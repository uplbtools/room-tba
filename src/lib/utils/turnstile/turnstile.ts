import { dev } from '$app/env';
import { env } from '$env/dynamic/private';
const { TURNSTILE_SECRET_KEY, TURNSTILE_ALLOW_UNCONFIGURED } = env;
import {
	turnstileMayBeUnconfigured,
	verifyTurnstileToken as verifyTurnstileTokenCore
} from './turnstile-core';

export function isTurnstileConfigured(): boolean {
	return Boolean(TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(
	token: string | null | undefined,
	_remoteIp?: string
): Promise<boolean> {
	return verifyTurnstileTokenCore(token, TURNSTILE_SECRET_KEY ?? '', {
		allowUnconfigured: turnstileMayBeUnconfigured({ dev, flag: TURNSTILE_ALLOW_UNCONFIGURED })
	});
}
