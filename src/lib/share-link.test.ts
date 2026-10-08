import { describe, expect, mock, test } from "bun:test";
import { shareLink } from "./share-link";

const data = { url: "https://roomtba.app/building/PSB", title: "PSB" };

describe("shareLink", () => {
  test("uses the native share sheet when available", async () => {
    const share = mock(async () => {});
    const copy = mock(async () => {});
    expect(await shareLink(data, { share, copy })).toBe("shared");
    expect(share).toHaveBeenCalledWith(data);
    expect(copy).not.toHaveBeenCalled();
  });

  test("copies the link when there is no share sheet", async () => {
    const copy = mock(async () => {});
    expect(await shareLink(data, { copy })).toBe("copied");
    expect(copy).toHaveBeenCalledWith(data.url);
  });

  test("dismissing the share sheet neither copies nor fails", async () => {
    const share = mock(async () => {
      throw new DOMException("Share canceled", "AbortError");
    });
    const copy = mock(async () => {});
    expect(await shareLink(data, { share, copy })).toBe("cancelled");
    expect(copy).not.toHaveBeenCalled();
  });

  test("falls back to copy when share is refused or unsupported", async () => {
    const copy = mock(async () => {});
    const refused = mock(async () => {
      throw new DOMException("No activation", "NotAllowedError");
    });
    expect(await shareLink(data, { share: refused, copy })).toBe("copied");
    expect(
      await shareLink(data, {
        share: mock(async () => {}),
        canShare: () => false,
        copy,
      }),
    ).toBe("copied");
    expect(copy).toHaveBeenCalledTimes(2);
  });

  test("propagates a failed copy so the caller can show an error", async () => {
    const copy = mock(async () => {
      throw new Error("blocked");
    });
    await expect(shareLink(data, { copy })).rejects.toThrow("blocked");
  });
});
