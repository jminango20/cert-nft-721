const cache = new Map<string, Record<string, unknown>>()

export function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")
  }
  return uri
}

export async function fetchMetadataWithCache(ipfsUri: string): Promise<Record<string, unknown>> {
  const url = ipfsToHttp(ipfsUri)
  if (cache.has(url)) return cache.get(url)!
  const data = (await (await fetch(url, { signal: AbortSignal.timeout(15000) })).json()) as Record<string, unknown>
  cache.set(url, data)
  return data
}
