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
const WHITE = "#ffffff";

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
        position: "relative",
        overflow: "hidden",
        fontFamily: "Inter",
      },
    },
    h("img", {
      src: new URL("/uplb-bg-og.jpg", url.origin).toString(),
      width: WIDTH,
      height: HEIGHT,
      style: {
        position: "absolute",
        inset: 0,
        objectFit: "cover",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        backgroundColor: "rgba(28, 8, 7, 0.48)",
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
            src: new URL("/logo.png", url.origin).toString(),
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
          },
        },
        h(
          "div",
          {
            style: {
              // block + lineClamp keeps entity names inside the card.
              display: "block",
              lineClamp: 2,
              fontSize: title.length > 42 ? 60 : title.length > 30 ? 72 : 86,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              color: WHITE,
              textShadow: "0 3px 10px rgba(0, 0, 0, 0.55)",
            },
          },
          title,
        ),
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

  return new ImageResponse(card as unknown as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: "Inter", data: font, weight: 700, style: "normal" }],
    headers: {
      "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
};
