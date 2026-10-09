import type { RequestHandler } from './$types';

// Hyperscript so we can build Satori elements without JSX in a .ts endpoint.
// A single child is passed bare, not array-wrapped: satori counts a
// one-string array as "more than one child node" and then demands
// display:flex, which silently disables lineClamp ellipsis (#651).
type El = { type: string; props: Record<string, unknown> };
function h(type: string, props: Record<string, unknown>, ...children: unknown[]): El {
	const flat = children.flat();
	return {
		type,
		props: { ...props, children: flat.length === 1 ? flat[0] : flat }
	};
}

const WIDTH = 1200;
const HEIGHT = 630;
const WHITE = '#ffffff';

let fontPromise: Promise<ArrayBuffer> | null = null;
// A static Inter weight (no fvar table) — satori/@vercel/og crash on variable
// fonts. Lives in /static and is read once per warm instance. The event fetch
// resolves it straight out of the build output instead of looping back over
// the network to our own origin.
function loadFont(fetcher: typeof fetch, origin: string): Promise<ArrayBuffer> {
	fontPromise ??= fetcher(new URL('/og-font.woff', origin)).then((r) => {
		if (!r.ok) throw new Error(`font ${r.status}`);
		return r.arrayBuffer();
	});
	return fontPromise;
}

const imagePromises = new Map<string, Promise<string>>();
/**
 * Satori fetches bare image URLs itself, and @vercel/og refuses any that
 * resolve to a local address (SSRF guard) — which is every request in dev and
 * preview. Inlining as a data URI sidesteps that and also spares production a
 * round trip to its own origin for two files that never change. Cached per
 * warm instance, like the font.
 */
function loadImage(
	fetcher: typeof fetch,
	origin: string,
	path: string,
	mime: string
): Promise<string> {
	let pending = imagePromises.get(path);
	if (!pending) {
		pending = fetcher(new URL(path, origin))
			.then(async (r) => {
				if (!r.ok) throw new Error(`${path} ${r.status}`);
				const bytes = Buffer.from(await r.arrayBuffer());
				return `data:${mime};base64,${bytes.toString('base64')}`;
			})
			.catch((e) => {
				imagePromises.delete(path);
				throw e;
			});
		imagePromises.set(path, pending);
	}
	return pending;
}

function clamp(value: string | null, max: number): string {
	const v = (value ?? '').trim();
	return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	// Exact-URL content is passed by the page: t=title, s=subtitle, k=kicker.
	// No title param means a page that did not name itself (the homepage).
	// The wordmark badge already brands the card, so repeating "Room TBA" as
	// the headline made it appear three times: site name, badge, headline.
	const title = clamp(url.searchParams.get('t'), 90);
	const subtitle = clamp(url.searchParams.get('s'), 96);
	const kicker = clamp(url.searchParams.get('k'), 40);

	let font: ArrayBuffer;
	let background: string;
	let logo: string;
	try {
		[font, background, logo] = await Promise.all([
			loadFont(fetch, url.origin),
			loadImage(fetch, url.origin, '/uplb-bg-og.jpg', 'image/jpeg'),
			loadImage(fetch, url.origin, '/logo.png', 'image/png')
		]);
	} catch {
		// A failed load must not poison every later request with the rejection.
		fontPromise = null;
		return new Response('card assets unavailable', { status: 500 });
	}

	const card = h(
		'div',
		{
			style: {
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				position: 'relative',
				overflow: 'hidden',
				fontFamily: 'Inter'
			}
		},
		h('img', {
			src: background,
			width: WIDTH,
			height: HEIGHT,
			style: {
				position: 'absolute',
				inset: 0,
				objectFit: 'cover'
			}
		}),
		// Flat tint, not a bottom-weighted gradient scrim: Satori does not
		// reliably honour backgroundImage gradients, so the card rendered
		// unchanged. The title carries its own surface instead (below), leaving
		// this tint responsible only for the wordmark and badge.
		h('div', {
			style: {
				position: 'absolute',
				inset: 0,
				display: 'flex',
				backgroundColor: 'rgba(28, 8, 7, 0.42)'
			}
		}),
		h(
			'div',
			{
				style: {
					position: 'relative',
					zIndex: 1,
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					height: '100%',
					padding: '56px 72px'
				}
			},
			// top row: wordmark + type
			h(
				'div',
				{
					style: {
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between'
					}
				},
				h(
					'div',
					{
						style: {
							display: 'flex',
							alignItems: 'center',
							gap: 18,
							padding: '10px 14px',
							backgroundColor: 'rgba(28, 8, 7, 0.62)',
							borderRadius: 18,
							fontSize: 32,
							fontWeight: 700,
							letterSpacing: '-0.02em',
							color: WHITE
						}
					},
					h('img', {
						src: logo,
						width: 50,
						height: 50
					}),
					'Room TBA'
				),
				kicker
					? h(
							'div',
							{
								style: {
									display: 'flex',
									fontSize: 20,
									fontWeight: 600,
									color: WHITE,
									background: 'rgba(163, 14, 0, 0.9)',
									borderRadius: 999,
									padding: '9px 18px',
									textTransform: 'uppercase',
									letterSpacing: '0.06em'
								}
							},
							kicker
						)
					: h('div', { style: { display: 'flex' } })
			),
			// main: entity-specific title + context
			h(
				'div',
				{
					style: {
						display: 'flex',
						flexDirection: 'column',
						marginTop: 'auto',
						maxWidth: 1040,
						// The photo has near-white lettering exactly where the title sits,
						// so a tint over the whole image cannot guarantee contrast. Give
						// the text its own surface instead: white on this is ~13:1 no
						// matter what the background photo does.
						backgroundColor: 'rgba(24, 7, 6, 0.82)',
						borderRadius: 22,
						padding: '26px 30px'
					}
				},
				title
					? h(
							'div',
							{
								style: {
									// block + lineClamp keeps entity names inside the card.
									display: 'block',
									lineClamp: 2,
									fontSize: title.length > 42 ? 60 : title.length > 30 ? 72 : 86,
									fontWeight: 700,
									lineHeight: 1.04,
									letterSpacing: '-0.03em',
									color: WHITE,
									textShadow: '0 2px 6px rgba(0, 0, 0, 0.95), 0 0 28px rgba(0, 0, 0, 0.8)'
								}
							},
							title
						)
					: h('div', { style: { display: 'flex' } }),
				subtitle
					? h(
							'div',
							{
								style: {
									display: 'block',
									lineClamp: 2,
									marginTop: 18,
									fontSize: 30,
									fontWeight: 500,
									lineHeight: 1.25,
									color: 'rgba(255, 255, 255, 0.9)',
									textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)'
								}
							},
							subtitle
						)
					: h('div', { style: { display: 'flex' } })
			)
		)
	);

	// Imported lazily: @vercel/og's bundled harfbuzz does require('fs') at
	// module load, which crashes SvelteKit's build-time route analysis.
	const { ImageResponse } = await import('@vercel/og');
	const image = new ImageResponse(card as unknown as never, {
		width: WIDTH,
		height: HEIGHT,
		fonts: [{ name: 'Inter', data: font, weight: 700, style: 'normal' }]
	});

	// ImageResponse hands back a streaming body. Buffer it and return a plain
	// Response instead: the stream does not survive the adapter's body handling
	// and the request dies before any error surfaces.
	const png = await image.arrayBuffer();

	return new Response(png, {
		headers: {
			'content-type': 'image/png',
			'cache-control': 'public, max-age=86400, s-maxage=604800, immutable'
		}
	});
};
