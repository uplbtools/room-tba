import { describe, expect, it } from 'vitest';
import { normalizeEntityName } from '#lib/utils/entity/entity-names.js';

describe('entity merge duplicate detection', () => {
	it('treats spacing and punctuation variants as the same name', () => {
		expect(normalizeEntityName('Physical  Sciences')).toBe(
			normalizeEntityName('Physical-Sciences')
		);
		expect(normalizeEntityName('CAS')).toBe(normalizeEntityName('C.A.S.'));
	});
});
