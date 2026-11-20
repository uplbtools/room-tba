import "@lib/og-hbjs-shim";
import type { APIRoute } from "astro";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm?module";
import satori, { init as initSatori } from "satori/standalone";
import yogaWasm from "satori/yoga.wasm?module";
import ogFontDataUrl from "../assets/og-font.woff?inline";
import bgImageDataUrl from "../assets/uplb-bg-og.jpg?inline";
import logoImageDataUrl from "../assets/logo.png?inline";

export const prerender = false;

// @vercel/og's edge entry eagerly fetches its bundled Geist TTF via
// `new URL(..., import.meta.url)`, which throws `Invalid URL string` in
// workerd. This endpoint renders the same tree through satori + resvg-wasm
// directly; both wasm modules init once per isolate.
let renderersPromise: Promise<void> | null = null;
function initRenderers(): Promise<void> {
  renderersPromise ??= Promise.all([
    initSatori(yogaWasm),
    initWasm(resvgWasm),
  ]).then(() => undefined);
  return renderersPromise;
}

// Emoji only: satori asks for a twemoji SVG data URI per missing grapheme,
// same CDN @vercel/og used. Other scripts get no fallback font (the card is
// English/Filipino campus copy; Inter covers it).
const U200D = String.fromCharCode(8205);
const UFE0F = /\uFE0F/g;
function emojiCode(char: string): string {
  const stripped = char.includes(U200D) ? char : char.replace(UFE0F, "");
  const points: string[] = [];
  for (let i = 0; i < stripped.length; i++) {
    const code = stripped.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < stripped.length) {
      const next = stripped.charCodeAt(++i);
      if (next >= 0xdc00 && next <= 0xdfff) {
        points.push(
          (0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)).toString(16),
        );
        continue;
      }
    }
    points.push(code.toString(16));
  }
  return points.join("-");
}

async function loadAdditionalAsset(
  code: string,
  segment: string,
): Promise<string | never[]> {
  if (code !== "emoji") return [];
  const res = await fetch(
    `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${emojiCode(segment).toLowerCase()}.svg`,
  );
  if (!res.ok) return [];
  return `data:image/svg+xml;base64,${btoa(await res.text())}`;
}

// Hyperscript so we can build Satori elements without JSX in a .ts endpoint.
// A single child is passed bare, not array-wrapped: satori counts a
// one-string array as "more than one child node" and then demands
// display:flex, which silently disables lineClamp ellipsis (#651).
type El = { type: string; props: Record<string, unknown> };
function h(
  type: string,
  props: Record<string, unknown>,
  ...children: unknown[]
): El {
  const flat = children.flat();
  return {
    type,
    props: { ...props, children: flat.length === 1 ? flat[0] : flat },
  };
}

const WIDTH = 1200;
const HEIGHT = 630;
const WHITE = "#ffffff";

function clamp(value: string | null, max: number): string {
  const v = (value ?? "").trim();
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

export const GET: APIRoute = async ({ url }) => {
  // Exact-URL content is passed by the page: t=title, s=subtitle, k=kicker.
  // No title param means a page that did not name itself (the homepage).
  // The wordmark badge already brands the card, so repeating "Room TBA" as
  // the headline made it appear three times: site name, badge, headline.
  const title = clamp(url.searchParams.get("t"), 90);
  const subtitle = clamp(url.searchParams.get("s"), 96);
  const kicker = clamp(url.searchParams.get("k"), 40);

  // Convert inline data URLs to ArrayBuffer for font and use data URLs directly for images
  const fontBase64 = ogFontDataUrl.split(",")[1];
  const font = Uint8Array.from(atob(fontBase64), (c) => c.charCodeAt(0)).buffer;
  const bgImage = bgImageDataUrl;
  const logoImage = logoImageDataUrl;

  const card = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter",
      },
    },
    h("img", {
      src: bgImage,
      width: WIDTH,
      height: HEIGHT,
      style: {
        position: "absolute",
        inset: 0,
        objectFit: "cover",
      },
    }),
    // Flat tint, not a bottom-weighted gradient scrim: Satori does not
    // reliably honour backgroundImage gradients, so the card rendered
    // unchanged. The title carries its own surface instead (below), leaving
    // this tint responsible only for the wordmark and badge.
    h("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        backgroundColor: "rgba(28, 8, 7, 0.42)",
      },
    }),
    h(
      "div",
      {
        style: {
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "56px 72px",
        },
      },
      // top row: wordmark + type
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "10px 14px",
              backgroundColor: "rgba(28, 8, 7, 0.62)",
              borderRadius: 18,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: WHITE,
            },
          },
          h("img", {
            src: logoImage,
            width: 50,
            height: 50,
          }),
          "Room TBA",
        ),
        kicker
          ? h(
              "div",
              {
                style: {
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 600,
                  color: WHITE,
                  background: "rgba(163, 14, 0, 0.9)",
                  borderRadius: 999,
                  padding: "9px 18px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                },
              },
              kicker,
            )
          : h("div", { style: { display: "flex" } }),
      ),
      // main: entity-specific title + context
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            maxWidth: 1040,
            // The photo has near-white lettering exactly where the title sits,
            // so a tint over the whole image cannot guarantee contrast. Give
            // the text its own surface instead: white on this is ~13:1 no
            // matter what the background photo does.
            backgroundColor: "rgba(24, 7, 6, 0.82)",
            borderRadius: 22,
            padding: "26px 30px",
          },
        },
        title
          ? h(
              "div",
              {
                style: {
                  // block + lineClamp keeps entity names inside the card.
                  display: "block",
                  lineClamp: 2,
                  fontSize:
                    title.length > 42 ? 60 : title.length > 30 ? 72 : 86,
                  fontWeight: 700,
                  lineHeight: 1.04,
                  letterSpacing: "-0.03em",
                  color: WHITE,
                  textShadow:
                    "0 2px 6px rgba(0, 0, 0, 0.95), 0 0 28px rgba(0, 0, 0, 0.8)",
                },
              },
              title,
            )
          : h("div", { style: { display: "flex" } }),
        subtitle
          ? h(
              "div",
              {
                style: {
                  display: "block",
                  lineClamp: 2,
                  marginTop: 18,
                  fontSize: 30,
                  fontWeight: 500,
                  lineHeight: 1.25,
                  color: "rgba(255, 255, 255, 0.9)",
                  textShadow: "0 2px 8px rgba(0, 0, 0, 0.6)",
                },
              },
              subtitle,
            )
          : h("div", { style: { display: "flex" } }),
      ),
    ),
  );

  await initRenderers();

  const svg = await satori(card as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: "Inter", data: font, weight: 700, style: "normal" }],
    loadAdditionalAsset,
  });

  // Same rasterizer options @vercel/og used: fit to width, height follows.
  const resvgJS = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  });
  const rendered = resvgJS.render();
  const png = rendered.asPng();
  rendered.free();
  resvgJS.free();

  return new Response(png.slice().buffer, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
};
