import { describe, expect, test } from 'vitest';
import * as v from 'valibot';
import { EntityAttributionQuery } from './editor';

const parse = (query: Record<string, string>) =>
	v.safeParse(EntityAttributionQuery, query, { abortEarly: true });

describe('EntityAttributionQuery', () => {
	test('accepts supported entity attribution requests', () => {
		expect(parse({ entityType: 'building', entityId: '12' }).output).toEqual({
			entityType: 'building',
			entityId: 12
		});
	});

	test('rejects unsupported entity types and invalid ids', () => {
		expect(parse({ entityType: 'alias', entityId: '12' }).issues?.[0].message).toBe('Unsupported entity type.');
		expect(parse({ entityType: 'room', entityId: '0' }).issues?.[0].message).toBe('Invalid entity ID.');
		expect(parse({ entityType: 'room', entityId: '1.5' }).issues?.[0].message).toBe('Invalid entity ID.');
		expect(parse({ entityType: 'room' }).issues?.[0].message).toBe('Invalid entity ID.');
		expect(parse({}).issues?.[0].message).toBe('Unsupported entity type.');
	});
});
