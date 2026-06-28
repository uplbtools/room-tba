import type { StoredProposalRef } from "../proposals/client";

export type PersistEntityChangeResult = {
  ok: boolean;
  error?: string;
  published?: unknown;
  proposal?: StoredProposalRef;
  latest?: unknown;
  mergeCandidate?: unknown;
  attemptedName?: string;
};

export type HandledPersistResult<TLatest> = {
  error: string | null;
  published?: TLatest;
  proposal?: StoredProposalRef;
  mergeCandidate?: unknown;
  attemptedName?: string;
};

export function handlePersistEntityResult<TLatest>(
  result: PersistEntityChangeResult,
  options: {
    syncFromServer: (latest: TLatest) => void;
    fallbackError: string;
  },
): HandledPersistResult<TLatest> {
  if (!result.ok) {
    if (result.latest) {
      options.syncFromServer(result.latest as TLatest);
    }
    return {
      error: result.error ?? options.fallbackError,
      mergeCandidate: result.mergeCandidate,
      attemptedName: result.attemptedName,
    };
  }

  if (result.published) {
    options.syncFromServer(result.published as TLatest);
    return { error: null, published: result.published as TLatest };
  }

  if (result.proposal) {
    return { error: null, proposal: result.proposal };
  }

  return { error: null };
}
