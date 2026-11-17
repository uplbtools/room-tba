import { describe, expect, test } from 'vitest';
import { directionsRequest, parsePoint } from './point.js';

describe('parsePoint', () => {
	test('reads coordinates and entity references', () => {
		expect(parsePoint('14.16,121.24', 'PSB')).toEqual({ lat: 14.16, lon: 121.24, name: 'PSB' });
		expect(parsePoint('room:7')).toEqual({ type: 'room', id: 7 });
	});

	test('rejects anything else', () => {
		for (const value of [null, '', 'room:x', 'college:1', 'a,b', '14.16']) {
			expect(parsePoint(value)).toBeNull();
		}
	});
});

describe('directionsRequest', () => {
	const to = 'to=14.16,121.24';

	test('starts from the GPS fix, rounded, when no start is picked', () => {
		expect(directionsRequest(new URLSearchParams(to), [121.243456, 14.167891])).toEqual({
			from: { lat: 14.1679, lon: 121.2435, name: 'Your location' },
			to: { lat: 14.16, lon: 121.24, name: undefined }
		});
	});

	test('a picked start wins over GPS, and no start means no request', () => {
		const params = new URLSearchParams(`${to}&from=building:3`);
		expect(directionsRequest(params, [121.2, 14.1])?.from).toEqual({ type: 'building', id: 3 });
		expect(directionsRequest(new URLSearchParams(to), null)).toBeNull();
	});
});
