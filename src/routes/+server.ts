import { type RequestHandler, redirect } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	return redirect(308, `/map${url.search}`);
};
