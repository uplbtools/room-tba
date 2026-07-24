import {
  parseKuboDormDirectory,
  type KuboDormDirectoryResponse,
} from "../kubo-dorms";

export const DEFAULT_KUBO_DIRECTORY_URL =
  "https://kubo.community/api/public/integrations/room-tba/dorms";

export type KuboDirectoryFetchResult = {
  directory: KuboDormDirectoryResponse;
  etag: string | null;
};

export async function fetchKuboDormDirectory(
  upstreamUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<KuboDirectoryFetchResult> {
  const response = await fetcher(upstreamUrl, {
    headers: { Accept: "application/json", "User-Agent": "room-tba" },
    signal: AbortSignal.timeout(2_000),
  });
  if (!response.ok) {
    throw new Error(`Kubo directory returned HTTP ${response.status}`);
  }

  const directory = parseKuboDormDirectory(await response.json());
  if (!directory) throw new Error("Kubo directory returned an invalid payload");

  return { directory, etag: response.headers.get("etag") };
}
