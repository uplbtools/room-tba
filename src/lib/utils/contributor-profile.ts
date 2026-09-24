export const CONTRIBUTOR_BIO_MAX_LENGTH = 280;
export const CONTRIBUTOR_LINK_LABEL_MAX_LENGTH = 40;
export const CONTRIBUTOR_LINK_URL_MAX_LENGTH = 2048;

export const SOCIAL_KINDS = [
	'github',
	'website',
	'discord',
	'messenger',
	'linkedin',
	'custom'
] as const;

export type SocialKind = (typeof SOCIAL_KINDS)[number];

export type ContributorSocialLinkInput = {
	kind: SocialKind;
	label: string | null;
	url: string;
	isPublic: boolean;
};

export type ContributorSocialLink = ContributorSocialLinkInput & {
	id: number;
	createdAt: string;
	updatedAt: string;
};

export type SocialKindMetadata = {
	label: string;
	defaultPublic: boolean;
	requiresDisclosure: boolean;
};

export const SOCIAL_KIND_METADATA: Record<SocialKind, SocialKindMetadata> = {
	github: { label: 'GitHub', defaultPublic: true, requiresDisclosure: false },
	website: { label: 'Website', defaultPublic: true, requiresDisclosure: false },
	discord: { label: 'Discord', defaultPublic: false, requiresDisclosure: true },
	messenger: { label: 'Messenger', defaultPublic: false, requiresDisclosure: true },
	linkedin: { label: 'LinkedIn', defaultPublic: true, requiresDisclosure: false },
	custom: { label: 'Custom link', defaultPublic: true, requiresDisclosure: false }
};

const KIND_ORDER: Record<SocialKind, number> = {
	github: 0,
	website: 1,
	discord: 2,
	messenger: 3,
	linkedin: 4,
	custom: 5
};
const SOCIAL_LINK_KEYS: Record<string, true> = {
	kind: true,
	label: true,
	url: true,
	isPublic: true
};
const APPROVED_LINKEDIN_HOSTS: Record<string, true> = {
	'linkedin.com': true,
	'linkedin.cn': true
};
const APPROVED_DISCORD_HOSTS: Record<string, true> = {
	'discord.com': true,
	'discordapp.com': true
};

export class ContributorProfileValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ContributorProfileValidationError';
	}
}
export function hasDisallowedControlCharacters(value: string, preserveLineBreaks = false): boolean {
	for (const character of value) {
		const code = character.codePointAt(0) ?? 0;
		if (code === 0x7f) return true;
		const allowedWhitespace = code === 0x09 || code === 0x0a || code === 0x0d;
		if (code < 0x20 && (!preserveLineBreaks || !allowedWhitespace)) return true;
	}
	return false;
}

export function isSocialKind(value: unknown): value is SocialKind {
	return typeof value === 'string' && (SOCIAL_KINDS as readonly string[]).includes(value);
}

export function socialKindLabel(kind: SocialKind): string {
	return SOCIAL_KIND_METADATA[kind].label;
}

export function socialLinkAccessibleLabel(
	link: Pick<ContributorSocialLinkInput, 'kind' | 'label'>
): string {
	const label = link.label?.trim();
	return label || socialKindLabel(link.kind);
}

export function normalizeHttpsUrl(value: unknown, field = 'URL'): string {
	if (typeof value !== 'string') {
		throw new ContributorProfileValidationError(`${field} must be a string.`);
	}
	const trimmed = value.trim();
	if (!trimmed) throw new ContributorProfileValidationError(`${field} is required.`);
	if (trimmed.length > CONTRIBUTOR_LINK_URL_MAX_LENGTH) {
		throw new ContributorProfileValidationError(`${field} is too long.`);
	}
	if (hasDisallowedControlCharacters(trimmed)) {
		throw new ContributorProfileValidationError(`${field} contains invalid characters.`);
	}

	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		throw new ContributorProfileValidationError(`${field} must be a valid URL.`);
	}
	if (parsed.protocol !== 'https:') {
		throw new ContributorProfileValidationError(`${field} must use HTTPS.`);
	}
	if (parsed.username || parsed.password) {
		throw new ContributorProfileValidationError(`${field} cannot contain credentials.`);
	}
	if (parsed.hash) {
		throw new ContributorProfileValidationError(`${field} cannot contain a fragment.`);
	}
	parsed.hostname = parsed.hostname.toLowerCase();
	return parsed.toString();
}

function normalizeHost(host: string): string {
	return host.toLowerCase().replace(/^www\./u, '');
}

function supportedPath(pathname: string, pattern: RegExp): boolean {
	return pattern.test(pathname.replace(/\/$/u, ''));
}

export function validateSocialUrl(kind: SocialKind, value: unknown): string {
	const normalized = normalizeHttpsUrl(value, `${socialKindLabel(kind)} URL`);
	const parsed = new URL(normalized);
	const host = normalizeHost(parsed.hostname);
	const path = parsed.pathname;

	switch (kind) {
		case 'github':
			if (host !== 'github.com' || !supportedPath(path, /^\/[A-Za-z0-9][A-Za-z0-9-]{0,38}$/u)) {
				throw new ContributorProfileValidationError('GitHub URL must point to a GitHub profile.');
			}
			break;
		case 'linkedin':
			if (
				!APPROVED_LINKEDIN_HOSTS[host] ||
				!supportedPath(path, /^\/in\/[A-Za-z0-9][A-Za-z0-9-_%]{0,99}$/u)
			) {
				throw new ContributorProfileValidationError(
					'LinkedIn URL must point to a LinkedIn profile.'
				);
			}
			break;
		case 'discord':
			if (
				!(
					(host === 'discord.gg' && supportedPath(path, /^\/[A-Za-z0-9_-]{2,100}$/u)) ||
					(APPROVED_DISCORD_HOSTS[host] &&
						supportedPath(path, /^\/invite\/[A-Za-z0-9_-]{2,100}$/u)) ||
					(APPROVED_DISCORD_HOSTS[host] && supportedPath(path, /^\/users\/[0-9]{2,30}$/u))
				)
			) {
				throw new ContributorProfileValidationError(
					'Discord URL must point to an invite or profile.'
				);
			}
			break;
		case 'messenger':
			if (
				!(
					(host === 'm.me' && supportedPath(path, /^\/[A-Za-z0-9._-]{1,100}$/u)) ||
					(host === 'messenger.com' && supportedPath(path, /^\/t\/[A-Za-z0-9._-]{1,100}$/u)) ||
					(host === 'facebook.com' &&
						supportedPath(path, /^\/messages\/t\/[A-Za-z0-9._-]{1,100}$/u))
				)
			) {
				throw new ContributorProfileValidationError(
					'Messenger URL must point to a messaging profile or invite.'
				);
			}
			break;
		case 'website':
		case 'custom':
			break;
	}

	return normalized;
}

export function normalizeSocialLinkInput(
	value: unknown,
	index: number
): ContributorSocialLinkInput {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new ContributorProfileValidationError(`Social link ${index + 1} must be an object.`);
	}
	const link = value as Record<string, unknown>;
	for (const key of Object.keys(link)) {
		if (!SOCIAL_LINK_KEYS[key]) {
			throw new ContributorProfileValidationError(
				`Social link ${index + 1} contains unknown field: ${key}.`
			);
		}
	}
	if (!isSocialKind(link.kind)) {
		throw new ContributorProfileValidationError(
			`Social link ${index + 1} has an unsupported kind.`
		);
	}
	if (typeof link.isPublic !== 'boolean') {
		throw new ContributorProfileValidationError(`Social link ${index + 1} visibility is invalid.`);
	}
	if (link.label !== null && link.label !== undefined && typeof link.label !== 'string') {
		throw new ContributorProfileValidationError(`Social link ${index + 1} label is invalid.`);
	}
	const label = typeof link.label === 'string' ? link.label.trim() : null;
	if (label && label.length > CONTRIBUTOR_LINK_LABEL_MAX_LENGTH) {
		throw new ContributorProfileValidationError(`Social link ${index + 1} label is too long.`);
	}
	if (link.kind === 'custom' && !label) {
		throw new ContributorProfileValidationError('Custom links need a label.');
	}
	return {
		kind: link.kind,
		label: label || null,
		url: validateSocialUrl(link.kind, link.url),
		isPublic: link.isPublic
	};
}

export function sortSocialLinks<T extends Pick<ContributorSocialLink, 'kind' | 'createdAt'>>(
	links: readonly T[]
): T[] {
	return [...links].sort((left, right) => {
		const kindOrder = KIND_ORDER[left.kind] - KIND_ORDER[right.kind];
		if (kindOrder !== 0) return kindOrder;
		return left.createdAt.localeCompare(right.createdAt);
	});
}

export function validateSocialLinkMultiplicity(links: readonly ContributorSocialLinkInput[]): void {
	const counts = new Map<SocialKind, number>();
	for (const link of links) counts.set(link.kind, (counts.get(link.kind) ?? 0) + 1);
	for (const kind of ['github', 'discord', 'messenger', 'linkedin'] as const) {
		if ((counts.get(kind) ?? 0) > 1) {
			throw new ContributorProfileValidationError(
				`Only one ${socialKindLabel(kind)} link is allowed.`
			);
		}
	}
}

export function hasPublicMessagingLink(links: readonly ContributorSocialLinkInput[]): boolean {
	return links.some(
		(link) => (link.kind === 'messenger' || link.kind === 'discord') && link.isPublic
	);
}
