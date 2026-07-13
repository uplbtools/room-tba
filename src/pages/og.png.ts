import type { APIRoute } from "astro";
import { ImageResponse } from "@vercel/og";

export const prerender = false;

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
const BRAND = "#a30e00";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";

let fontPromise: Promise<ArrayBuffer> | null = null;
// A static Inter weight (no fvar table) — satori/@vercel/og crash on variable
// fonts. Lives in /public and is fetched once per warm instance.
function loadFont(origin: string): Promise<ArrayBuffer> {
  fontPromise ??= fetch(new URL("/og-font.woff", origin)).then((r) => {
    if (!r.ok) throw new Error(`font ${r.status}`);
    return r.arrayBuffer();
  });
  return fontPromise;
}

function clamp(value: string | null, max: number): string {
  const v = (value ?? "").trim();
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

export const GET: APIRoute = async ({ url }) => {
  // Exact-URL content is passed by the page: t=title, s=subtitle, k=kicker.
  const title = clamp(url.searchParams.get("t"), 90) || "Room TBA";
  const subtitle = clamp(url.searchParams.get("s"), 96);
  const kicker = clamp(url.searchParams.get("k"), 40);

  let font: ArrayBuffer;
  try {
    font = await loadFont(url.origin);
  } catch {
    return new Response("font unavailable", { status: 500 });
  }

  const card = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "#faf7f6",
        borderTop: `18px solid ${BRAND}`,
        fontFamily: "Inter",
      },
    },
    // top row: wordmark + kicker
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
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: BRAND,
          },
        },
        h("img", {
          src: new URL("/logo.png", url.origin).toString(),
          width: 52,
          height: 52,
        }),
        "Room TBA",
      ),
      kicker
        ? h(
            "div",
            {
              style: {
                display: "flex",
                fontSize: 26,
                fontWeight: 600,
                color: "#fff",
                background: BRAND,
                borderRadius: 999,
                padding: "8px 22px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              },
            },
            kicker,
          )
        : h("div", { style: { display: "flex" } }),
    ),
    // main: title + subtitle
    h(
      "div",
      { style: { display: "flex", flexDirection: "column" } },
      h(
        "div",
        {
          style: {
            // block + lineClamp: long titles wrap to a second line and only
            // then ellipsize, instead of overflowing off the card. Needs the
            // bare-string child from h() above; flex renders but drops the
            // clamp (title overflows as one line).
            display: "block",
            lineClamp: 2,
            fontSize: title.length > 40 ? 62 : title.length > 34 ? 74 : 92,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: INK,
          },
        },
        title,
      ),
      subtitle
        ? h(
            "div",
            {
              style: {
                display: "flex",
                marginTop: 22,
                fontSize: 36,
                fontWeight: 500,
                lineHeight: 1.25,
                color: MUTED,
              },
            },
            subtitle,
          )
        : h("div", { style: { display: "flex" } }),
    ),
    // footer
    h(
      "div",
      {
        style: { display: "flex", fontSize: 24, fontWeight: 500, color: MUTED },
      },
      "Find rooms and plan classes at UPLB",
    ),
  );

  return new ImageResponse(card as unknown as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: "Inter", data: font, weight: 700, style: "normal" }],
    headers: {
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
};
