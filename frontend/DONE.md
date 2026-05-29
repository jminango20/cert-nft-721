# Frontend — DONE

## O que foi construído

Next.js 14 App Router PWA com três fluxos de uso.

### Páginas

| Rota | Fluxo | Descrição |
|------|-------|-----------|
| `/` | — | Landing page com links para os 3 fluxos |
| `/admin` | Admin (MetaMask/wagmi) | Emitir + revogar certificados |
| `/aluno` | Aluno (Privy) | Buscar e visualizar certificado próprio |
| `/verify` | Público | Formulário de busca por Token ID |
| `/verify/[tokenId]` | Público | Detalhe com status VÁLIDO / REVOGADO |

### Componentes

- `MintForm` — formulário de emissão com hash de studentId
- `RevokeForm` — revogação com confirmação em dois cliques
- `CertificateCard` — exibe certificado (curso, status, datas)
- `ConnectButton` — MetaMask via wagmi
- `PrivyButton` — login via Privy (e-mail ou carteira)

### Libs

- `wagmiConfig.ts` — Polygon Amoy chain config
- `privyConfig.ts` — Privy login methods
- `api.ts` — wrappers fetch para o backend
- `contractAbi.ts` — ABI mínima para leituras on-chain

### Como rodar

```bash
cp .env.local.example .env.local
# preencher .env.local
npm install
npm run dev
```

---

## QA fixes (2026-05-28)

### Issue 1 — NEXT_PUBLIC_API_KEY removed from browser bundle

- Created `app/api/mint/route.ts` — Next.js Route Handler that reads `API_KEY`
  from `process.env.API_KEY` (server-only) and proxies POST to the Express backend.
- Created `app/api/revoke/route.ts` — same pattern for revoke.
- Updated `lib/api.ts` — `mint` and `revoke` now call `/api/mint` and `/api/revoke`
  (local Next.js routes); `NEXT_PUBLIC_API_KEY` removed entirely.
- Updated `.env.local.example` — replaced `NEXT_PUBLIC_API_KEY` with `API_KEY`.

### Issue 2 — PWA icons created

- Added `scripts/generate-icons.mjs` — zero-dependency Node script that writes
  valid deflate-compressed RGB PNGs.
- Generated `public/icon-192.png` (192x192, #6366f1) and `public/icon-512.png`
  (512x512, #6366f1) referenced by `public/manifest.json`.

### Issue 4 — Evidence section on verify page

- Created `components/EvidenceList.tsx` — client component (`"use client"`) that
  renders each `evidence[]` item from the certificate IPFS metadata as a card.
  - Icon per type: document (PDF/red), image (blue), link (green), video (purple).
  - Per-card open/download button that resolves `ipfs://` URLs via Pinata gateway.
  - Optional "Verificar integridade" button: fetches the file, computes
    `keccak256(Uint8Array)` via `viem`, compares with the stored `hash` field,
    and displays a green ✓ or red ✗ badge with the first 18 chars of both hashes.
  - No wallet / wagmi / privy imports — SSR safe.
- Updated `app/verify/[tokenId]/page.tsx` — imports `EvidenceList` and renders it
  below `CertificateCard` when `metadata.evidence` is a non-empty array.

---

### Issue 3 — layout.tsx is now a server component

- Created `app/providers.tsx` (`"use client"`) — wraps PrivyProvider, WagmiProvider,
  QueryClientProvider.
- Rewrote `app/layout.tsx` — no `"use client"` directive; exports `metadata` const
  for Next.js SEO; delegates client tree to `<Providers>`.

---

## Build fixes (2026-05-29)

### Fix 1 — webpack alias for React Native async-storage

- Added `webpack` callback in `next.config.js` that sets
  `config.resolve.alias["@react-native-async-storage/async-storage"] = false`.
- Prevents build error when Privy/wagmi pulls in this React Native package.

### Fix 2 — separate `viewport` export in layout.tsx

- Added `import type { Viewport } from "next"` to `app/layout.tsx`.
- Extracted `themeColor` and `viewport` out of `export const metadata` into a
  dedicated `export const viewport: Viewport = { themeColor: "#2563eb" }`.
- Satisfies Next.js 14 requirement that viewport config lives in its own export.

### Fix 3 — .env.local.example already present

- `frontend/.env.local.example` already existed with `NEXT_PUBLIC_PRIVY_APP_ID`
  and other keys — no changes needed.

