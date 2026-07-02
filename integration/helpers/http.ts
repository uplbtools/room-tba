import { PREVIEW_BASE, integrationPassword, previewFetchInit } from "../helpers/env";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

export async function loginViaApi(username: string) {
  const form = new FormData();
  form.set("username", username);
  form.set("password", integrationPassword());
  const res = await fetch(`${PREVIEW_BASE}/api/admin/auth`, previewFetchInit({
    method: "POST",
    body: form,
    redirect: "manual",
  }));
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/admin_session=[^;]+/);
  return match?.[0] ?? null;
}

export async function patchBuilding(
  id: number,
  body: Record<string, unknown>,
  cookie: string,
) {
  return fetch(`${PREVIEW_BASE}/api/admin/buildings/${id}`, previewFetchInit({
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  }));
}

export async function submitProposal(
  body: Record<string, unknown>,
  cookie?: string,
) {
  return fetch(`${PREVIEW_BASE}/api/proposals`, previewFetchInit({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  }));
}

export async function approveProposalHttp(id: number, cookie: string) {
  return fetch(`${PREVIEW_BASE}/api/admin/proposals/${id}/approve`, previewFetchInit({
    method: "POST",
    headers: { Cookie: cookie },
  }));
}

export { E2E_FIXTURES };
