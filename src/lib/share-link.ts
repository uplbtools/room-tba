import { copyTextToClipboard } from "@lib/clipboard";

export type ShareLinkOutcome = "shared" | "copied" | "cancelled";

type ShareDeps = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  copy: (text: string) => Promise<void>;
};

function browserDeps(): ShareDeps {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  return {
    share: nav?.share?.bind(nav),
    canShare: nav?.canShare?.bind(nav),
    copy: copyTextToClipboard,
  };
}

/**
 * Native share sheet when the browser has one (phones), else copy the link.
 * Dismissing the share sheet is a choice, not a failure: no copy, no toast.
 * Throws only when the copy fallback itself fails.
 */
export async function shareLink(
  data: { url: string; title?: string; text?: string },
  deps: ShareDeps = browserDeps(),
): Promise<ShareLinkOutcome> {
  if (deps.share && (deps.canShare?.(data) ?? true)) {
    try {
      await deps.share(data);
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return "cancelled";
      }
      // NotAllowedError (no user activation, iframe policy) etc.: copy instead.
    }
  }
  await deps.copy(data.url);
  return "copied";
}
