import type { APIRoute } from "astro";
import { PAYMONGO_SECRET_KEY } from "astro:env/server";

export const prerender = false;

const MIN_PESOS = 10;
const MAX_PESOS = 50000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * One-time donations via a PayMongo Checkout Session (same pattern as
 * kape.stimmie.dev). The hosted checkout handles all payment data — no card
 * or wallet details ever touch this server. See docs/funding-model.md.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: { amount?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const pesoAmount = Math.floor(Number(body.amount));
  if (
    !Number.isFinite(pesoAmount) ||
    pesoAmount < MIN_PESOS ||
    pesoAmount > MAX_PESOS
  ) {
    return json(400, {
      error: `Amount must be between ₱${MIN_PESOS} and ₱${MAX_PESOS.toLocaleString()}`,
    });
  }

  const secretKey = PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    return json(503, { error: "Donations are not configured yet" });
  }

  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 200) : "";
  const description = message
    ? `Room TBA donation — "${message}"`
    : `Room TBA donation — ₱${pesoAmount.toLocaleString()}`;

  const origin = new URL(request.url).origin;

  const response = await fetch(
    "https://api.paymongo.com/v1/checkout_sessions",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description,
            line_items: [
              {
                currency: "PHP",
                amount: pesoAmount * 100,
                name: "🗺️ Room TBA / UPLB Tools donation",
                quantity: 1,
                description,
              },
            ],
            payment_method_types: ["qrph"],
            success_url: `${origin}/donate?success=true`,
            cancel_url: `${origin}/donate?cancelled=true`,
          },
        },
      }),
    },
  );

  const data = (await response.json()) as {
    data?: { attributes?: { checkout_url?: string } };
    errors?: { detail?: string }[];
  };

  if (!response.ok) {
    console.error("PayMongo error:", JSON.stringify(data.errors ?? data));
    return json(response.status, {
      error: data.errors?.[0]?.detail ?? "Failed to create checkout session",
    });
  }

  const checkoutUrl = data.data?.attributes?.checkout_url;
  if (!checkoutUrl) return json(502, { error: "No checkout URL returned" });
  return json(200, { checkout_url: checkoutUrl });
};
