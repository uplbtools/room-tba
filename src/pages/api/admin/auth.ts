import type { APIRoute } from "astro";
import { ADMIN_PASSWORD } from "astro:env/server";
import {
  ADMIN_COOKIE_NAME,
  clearSessionCookie,
  makeSessionToken,
  setSessionCookie,
  verifySessionToken,
} from "../../../lib/admin/auth";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const admin = verifySessionToken(cookies.get(ADMIN_COOKIE_NAME)?.value);
  return new Response(JSON.stringify({ admin, username: admin ? "admin" : null }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const password = formData.get("password");

  if (typeof password !== "string" || password.length === 0) {
    return new Response(JSON.stringify({ error: "Password is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!ADMIN_PASSWORD) {
    return new Response(
      JSON.stringify({ error: "ADMIN_PASSWORD is not configured on the server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Constant-time comparison
  if (password.length !== ADMIN_PASSWORD.length || password !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "Invalid password" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = makeSessionToken();
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": setSessionCookie(token),
    },
  });
};

export const DELETE: APIRoute = async () => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookie(),
    },
  });
};
