import LRU from "lru-cache";

// H7: Bounded LRU cache with TTL to prevent unbounded memory growth
const cache = new LRU<string, Record<string, unknown>>({
  max: 500,
  ttl: 1000 * 60 * 60, // 1 hour
});

export function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }
  return uri;
}

export async function fetchMetadataWithCache(ipfsUri: string): Promise<Record<string, unknown>> {
  const url = ipfsToHttp(ipfsUri);
  const cached = cache.get(url);
  if (cached !== undefined) return cached;
  const data = (await (await fetch(url, { signal: AbortSignal.timeout(15000) })).json()) as Record<string, unknown>;
  cache.set(url, data);
  return data;
}
