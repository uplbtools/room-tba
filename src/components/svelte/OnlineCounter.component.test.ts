import { render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import OnlineCounter from "@ui/OnlineCounter.svelte";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("OnlineCounter", () => {
  test("renders the count the API reports", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ online: 7 })),
    );

    render(OnlineCounter);

    expect(await screen.findByText(/7 online/)).toBeInTheDocument();
  });

  test("shows -- and never a made-up number when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    render(OnlineCounter);

    expect(await screen.findByText("--")).toBeInTheDocument();
    // Regression guard: the old counter invented a number between 20 and 150.
    expect(screen.queryByText(/\d+ online/)).toBeNull();
  });

  test("shows -- when the API answers with an error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "invalid sid" }, 400)),
    );

    render(OnlineCounter);

    expect(await screen.findByText("--")).toBeInTheDocument();
  });

  test("keeps the last known count when a later heartbeat fails", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ online: 12 }))
      .mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    render(OnlineCounter);
    await vi.waitFor(() => expect(screen.getByText(/12 online/)).toBeTruthy());

    await vi.advanceTimersByTimeAsync(30_000);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/12 online/)).toBeInTheDocument();
  });

  test("posts only an anonymous sessionStorage sid, reused across heartbeats", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ online: 3 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    render(OnlineCounter);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/presence");
    const body = JSON.parse(init.body as string);

    // Privacy: the payload is a random session id and nothing else.
    expect(Object.keys(body)).toEqual(["sid"]);
    expect(body.sid).toMatch(/^[a-zA-Z0-9-]{8,64}$/);
    expect(sessionStorage.getItem("rt-presence-sid")).toBe(body.sid);

    await vi.advanceTimersByTimeAsync(30_000);
    const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(secondInit.body as string).sid).toBe(body.sid);
  });

  test("stops heartbeating after unmount", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ online: 3 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    const { unmount } = render(OnlineCounter);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    unmount();
    await vi.advanceTimersByTimeAsync(90_000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
