import { error, json, type RequestHandler } from '@sveltejs/kit';
import type { Room } from '$lib/utils/types';
import {
	getBuildingRooms,
	getCollegeRooms,
	getDivisionRooms,
	getRoomByCode,
	searchRooms
} from './room-utils';

export const GET: RequestHandler = async ({ url }) => {
	const searchKeys = Array.from(url.searchParams.keys());
	if (searchKeys.length !== 1) throw error(400, { message: 'No search query specified' });

	const searchField = searchKeys[0] as string;
	const fieldSets = ['building_id', 'college_id', 'division_id', 'code', 'search_code'];
	if (!fieldSets.includes(searchField))
		throw error(400, {
			message: 'Bad Request'
		});
	if (searchField === 'code') {
		const code = url.searchParams.get(searchField) as string;
		const room = await getRoomByCode(code);
		return new Response(
			JSON.stringify(
				{
					data: room,
					success: true
				},
				null,
				2
			)
		);
	}

	if (searchField === 'search_code') {
		const searchString = url.searchParams.get(searchField) as string;
		if (searchString === '')
			return new Response(JSON.stringify({ data: [], success: true }, null, 2));
		const rooms = await searchRooms(searchString);
		return new Response(
			JSON.stringify(
				{
					data: rooms,
					success: true
				},
				null,
				2
			)
		);
	}

	const id = parseInt(url.searchParams.get(searchField) as string, 10);
	let data: null | Room[] = null;
	if (Number.isNaN(id))
		throw error(400, {
			message: 'Id parsing error'
		});

	switch (searchField) {
		case 'building_id':
			data = await getBuildingRooms(id);
			break;
		case 'college_id':
			data = await getCollegeRooms(id);
			break;
		case 'division_id':
			data = await getDivisionRooms(id);
			break;
	}

	if (data?.length === 0)
		throw error(404, {
			message: 'Room not found'
		});
	return json(data);
};
