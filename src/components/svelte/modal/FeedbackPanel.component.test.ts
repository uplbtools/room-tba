import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import FeedbackPanel from "./FeedbackPanel.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

function typeMessage(text: string) {
  const box = screen.getByLabelText("Your message");
  return fireEvent.input(box, { target: { value: text } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FeedbackPanel", () => {
  test("renders the box, the optional contact, and both community links at 320px", () => {
    mountAtWidth(320);
    const { container } = render(FeedbackPanel);

    expect(screen.getByLabelText("Your message")).toBeVisible();
    expect(screen.getByLabelText("Contact (optional)")).toBeVisible();
    expect(screen.getByRole("link", { name: "Messenger" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Discord" })).toBeVisible();
    expectNoHorizontalOverflow(container);
  });

  test("lists what is attached before anything is sent", () => {
    render(FeedbackPanel);
    const note = screen.getByText(/Sent with your message/i);
    expect(note.textContent).toMatch(/app version v/);
    expect(note.textContent).toMatch(/No email and no IP address are stored/i);
  });

  test("keeps send disabled until the message has content", async () => {
    render(FeedbackPanel);
    const send = screen.getByRole("button", { name: "Send feedback" });
    expect(send).toBeDisabled();

    await typeMessage("   ");
    expect(send).toBeDisabled();

    await typeMessage("the map is blank");
    expect(send).toBeEnabled();
  });

  test("posts the message with its context and shows a success state", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(FeedbackPanel);
    await typeMessage("the map is blank");
    await fireEvent.click(
      screen.getByRole("button", { name: "Send feedback" }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/feedback");
    const body = JSON.parse(String(init.body));
    expect(body.message).toBe("the map is blank");
    expect(body.screen).toBe("/");
    expect(body.appVersion).toMatch(/^v/);
    expect(typeof body.wasOnline).toBe("boolean");

    await waitFor(() => {
      expect(screen.getByText(/Sent\. Thank you/i)).toBeVisible();
    });
  });

  test("shows a busy state and blocks a second send while in flight", async () => {
    let release: (value: Response) => void = () => {};
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(FeedbackPanel);
    await typeMessage("a room is missing");
    await fireEvent.click(
      screen.getByRole("button", { name: "Send feedback" }),
    );

    const busy = await screen.findByRole("button", { name: "Sending…" });
    expect(busy).toBeDisabled();
    expect(screen.getByLabelText("Your message")).toBeDisabled();

    await fireEvent.click(busy);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    release({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);
    await waitFor(() => {
      expect(screen.getByText(/Sent\. Thank you/i)).toBeVisible();
    });
  });

  test("keeps the typed message when the send fails", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Could not send your message." }),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(FeedbackPanel);
    await typeMessage("directions to CAS are wrong");
    await fireEvent.click(
      screen.getByRole("button", { name: "Send feedback" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Could not send your message.",
      );
    });
    expect(screen.getByLabelText("Your message")).toHaveValue(
      "directions to CAS are wrong",
    );
    expect(screen.getByRole("button", { name: "Send feedback" })).toBeEnabled();
  });

  test("keeps the typed message when the network throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );

    render(FeedbackPanel);
    await typeMessage("jeepney route missing");
    await fireEvent.click(
      screen.getByRole("button", { name: "Send feedback" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Network error/i);
    });
    expect(screen.getByLabelText("Your message")).toHaveValue(
      "jeepney route missing",
    );
  });
});
