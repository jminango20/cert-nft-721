# Backend — DONE

## fix(backend): pre-deploy audit — LOW fixes

### Files changed
- `backend/.gitignore` — L1
- `src/index.ts` — L2, L5, L6, L8
- `src/routes/mint.ts` — L7
- `backend/tsconfig.json` — L4
- `src/services/ipfs.ts` — L4 (side-effect fix)

### Fixes applied

**L1 — tx-index.json not in .gitignore** (`backend/.gitignore`)
Added `tx-index.json` to the ignore list alongside `claims.json` and `educert.db`.

**L2 — PRIVATE_KEY format not validated** (`src/index.ts`)
Added format check inside `validateEnv()`: strips optional `0x` prefix and tests
`/^[0-9a-fA-F]{64}$/`. Exits at startup with `"PRIVATE_KEY must be a 64-character
hex string"` if the value is malformed, preventing cryptic ethers errors at request time.

**L3 — Inline partial ABI duplicate** (`src/routes/certificates.ts`)
Already resolved by a previous agent: `ABI` is exported from `src/services/blockchain.ts`
and `certificates.ts` uses `getReadContract()` rather than a local ABI literal. No change
needed.

**L4 — Missing DOM lib for fetch/AbortSignal** (`backend/tsconfig.json`)
Added `"DOM"` to the `lib` array: `["ES2020", "DOM"]`. Fixed the resulting type error in
`src/services/ipfs.ts` where `new File([buffer], ...)` expected a `BlobPart`-compatible
value: changed `[buffer]` to `[new Uint8Array(buffer)]` which satisfies the DOM `File`
constructor under strict typing.

**L5 — RESEND_FROM_EMAIL not validated** (`src/index.ts`)
Added a warning (not exit) inside `validateEnv()`: if `RESEND_API_KEY` is set but
`RESEND_FROM_EMAIL` is not, logs `[env] RESEND_API_KEY is set but RESEND_FROM_EMAIL is
not — emails may fail if default domain is unverified`.

**L6 — No request correlation ID** (`src/index.ts`)
Added middleware (after `express.json()`) that calls `crypto.randomUUID()` (Node 18+
built-in) and stores the result in `res.locals.requestId`. The middleware also logs
`[request] METHOD /path id=<uuid>` for every incoming request, enabling log correlation
across concurrent async operations.

**L7 — issueDate format not validated** (`src/routes/mint.ts`)
Added `.refine(val => !isNaN(Date.parse(val)), { message: "issueDate must be a valid
date string" })` to the `issueDate` field in `MintSchema`. Values like `"not a date"`
now return a 400 validation error instead of being silently stored in IPFS metadata.

**L8 — Helmet defaults only** (`src/index.ts`)
Replaced `helmet()` with an explicit config: `defaultSrc: ["'self'"]`,
`scriptSrc: ["'none'"]`, `objectSrc: ["'none'"]`. Set `crossOriginEmbedderPolicy: false`
to prevent breaking IPFS/Pinata image loading.

### Verification
- `npx tsc --noEmit` exits 0 with no errors after all changes.

---

## fix(backend): pre-deploy audit — MEDIUM fixes

### Files changed
- `src/routes/mint.ts` — M1, M5
- `src/routes/revoke.ts` — M2
- `src/routes/verify.ts` — M2
- `src/services/email.ts` — M3
- `src/services/claims.ts` — M4
- `src/services/TxIndex.ts` — M4
- `src/types/index.ts` — M5
- `src/routes/claim.ts` — M5
- `src/routes/claim.test.ts` — M5 (fixture update)
- `src/services/ipfs.ts` — M6
- `src/index.ts` — M7
- `src/services/blockchain.ts` — M8
- `src/services/CertificateRepository.ts` — M9

### Fixes applied

**M1 — Zod validation on POST /api/mint** (`src/routes/mint.ts`)
Replaced ad-hoc `if (!field)` checks and `Number()` coercions (lines 82-99) with a
`MintSchema` Zod object. Uses `.trim().min(1)` for required strings (whitespace-only
rejected), numeric union transforms for `ects` and `eqfLevel` with range refinements,
and `.passthrough()` to preserve `evidenceTitles`/`evidenceTypes`. Applied via the
existing `validate` middleware inserted after `upload.array`.

**M2 — Unsafe error cast leaks internals** (`src/routes/revoke.ts`, `src/routes/verify.ts`)
Replaced `(err as { message? }).message` responses with `console.error` for the full
error server-side and a fixed generic message `"Blockchain operation failed"` for 500s.
Non-500 status codes (e.g. 404) retain their specific messages. HTTP status code logic
unchanged.

**M3 — HTML injection in email template** (`src/services/email.ts`)
Added `escapeHtml(str)` helper replacing `&`, `<`, `>`, `"`, `'` with HTML entities.
Applied to `recipientName`, `courseTitle`, and the claim URL before interpolation into
the HTML email body.

**M4 — process.cwd() path fragility** (`src/services/claims.ts`, `src/services/TxIndex.ts`)
Replaced `path.resolve(process.cwd(), ...)` with `path.resolve(__dirname, '../../...')` so
paths are relative to the compiled source file, not the process working directory.

**M5 — Recipient email in plaintext JSON** (`src/types/index.ts`, `src/routes/mint.ts`, `src/routes/claim.ts`, `src/routes/claim.test.ts`)
Removed `recipientEmail` from the `ClaimRecord` interface; it is no longer written to
`claims.json`. The email is still available in the mint route handler from `req.body`
(sent directly to Resend) and remains in the SQLite `Certificate` table (via the direct-
mint and claim-completion paths). The claim.ts else-branch fallback now saves without
email (null) — acceptable for the PoC since the email was already sent at mint time.

**M6 — New PinataSDK per call** (`src/services/ipfs.ts`)
Removed the `getClient()` factory function. The SDK is now instantiated once at module
level (`const pinata = new PinataSDK(...)`) and reused by all three exported functions.

**M7 — CORS insecure fallback** (`src/index.ts`)
`FRONTEND_URL` is now split on commas and each entry trimmed, producing an
`allowedOrigins` array. The CORS `origin` callback checks incoming requests against that
array. Requests with no `Origin` header (curl, server-to-server) are always allowed. A
startup warning is logged if `allowedOrigins` is empty.

**M8 — isLocked hardcoded true** (`src/services/blockchain.ts`)
`contract.locked(tokenId)` is now called in the same `Promise.all` alongside
`ownerOf` and `isRevoked`. The returned boolean is used directly for `isLocked` in the
`CertificateInfo` response.

**M9 — DATABASE_URL relative path fallback** (`src/services/CertificateRepository.ts`)
Default fallback changed from `"file:./educert.db"` to
`"file:" + path.resolve(__dirname, '../../educert.db')` for a stable absolute path
regardless of working directory. Added `import path from "path"`.

### Verification
- `npx tsc --noEmit` exits 0 with no errors after all changes.

---

## fix(backend): pre-deploy audit — CRITICAL and HIGH fixes

### Files changed
- `src/routes/claim.ts`
- `src/routes/certificates.ts`
- `src/routes/verify.ts`
- `src/routes/metadata.ts`
- `src/routes/mint.ts`
- `src/index.ts`
- `src/services/CertificateRepository.ts`

### Fixes applied

**C1 — Double-mint race condition** (`src/routes/claim.ts`)
Added a module-level `Set<string> processingTokens`. Before any async work the
POST handler checks-and-adds the token synchronously (atomic in Node's single
thread) and deletes it in a `finally` block. Returns 409 immediately if the
token is already being processed.

**C2 — Sync file I/O** (pre-existing; verified)
`src/services/claims.ts` and `src/services/TxIndex.ts` already used
`fs.promises.*`. Fixed callers that were missing `await` (`claim.ts` GET and
POST, `mint.ts` `saveClaim` call, `CertificateRepository.ts` `markRevoked`).

**C3 — No Express error handler** (`src/index.ts`)
Added a 4-argument `(err, req, res, next)` error handler registered after all
routes, before `app.listen`.

**C4 — No startup env validation** (`src/index.ts`)
Added `validateEnv()` called before `app.listen`. Exits with code 1 listing any
missing required vars (`PRIVATE_KEY`, `RPC_URL`, `CONTRACT_ADDRESS`,
`PINATA_JWT`, `API_KEY`). Warns (no exit) if `DATABASE_URL` or `FRONTEND_URL`
are absent.

**H1 — Singleton provider/signer** (pre-existing; verified)
`src/services/blockchain.ts` already initialises provider and signer once as
module-level `let` variables.

**H2 — Duplicate blockchain setup** (`src/routes/certificates.ts`)
Removed the local `getProvider` / `getContract` functions and their ABI
literal. Now imports `getReadContract` from `src/services/blockchain.ts`.
Also fixed the import of `readAll` (non-existent) to the correct `getAllTx`.

**H3 — Unlimited parallel RPC calls** (`src/routes/certificates.ts`)
Ownership checks and detail fetches now iterate in chunks of 20 using a
`for` loop with `Promise.all` per chunk. Added `?page=N&limit=N` query params.
Response shape changed to `{ data: [...], page, limit, total }`.

**H4 — Silent tokenId "0" fallback** (pre-existing; verified)
`src/services/blockchain.ts` already throws a descriptive error when
`CertificateMinted` is not found in the receipt.

**H5 — saveTx never called** (pre-existing; verified)
`src/services/blockchain.ts` already calls `saveTx(tokenId, receipt.hash)`
after extracting the tokenId.

**H6 — No rate limiting on public endpoints**
Added `express-rate-limit` (60 req/min per IP) to:
- `src/routes/verify.ts` — GET `/:tokenId`
- `src/routes/metadata.ts` — GET `/:tokenId`
- `src/routes/certificates.ts` — GET `/`
- `src/routes/claim.ts` — GET `/:token`

**H7 — Unbounded in-memory cache** (pre-existing; verified)
`src/services/MetadataCache.ts` already uses `lru-cache` v7 with
`max: 500` and `ttl: 3 600 000 ms`.

**H8 — No graceful shutdown** (`src/index.ts`)
`app.listen(...)` result stored as `const server`. `SIGTERM` and `SIGINT`
handlers call `server.close(() => process.exit(0))`.

**H9 — PII on unauthenticated endpoint** (`src/routes/certificates.ts`)
`recipientName` removed from the response object in `GET /api/certificates`.

### Verification
- `npx tsc --noEmit` exits 0 with no errors after all changes.

### Required environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Issuer wallet private key |
| `RPC_URL` | Yes | Sepolia JSON-RPC endpoint |
| `CONTRACT_ADDRESS` | Yes | Deployed EduCert contract address |
| `PINATA_JWT` | Yes | Pinata v2 JWT for IPFS uploads |
| `API_KEY` | Yes | `x-api-key` header value for write routes |
| `DATABASE_URL` | Warn | SQLite path e.g. `file:./educert.db` |
| `FRONTEND_URL` | Warn | CORS allowed origin (default `http://localhost:3000`) |
| `PORT` | No | HTTP port (default `3001`) |
| `RESEND_API_KEY` | No | Resend key for claim-by-email (optional) |
| `RESEND_FROM_EMAIL` | No | Sender address for claim emails (optional) |

---

## fix(backend): upsert in markRevoked to handle legacy tokens

### Problem
`markRevoked` used `prisma.certificate.update`, which throws `RecordNotFound` when the
row does not exist — for example, certificates minted before Prisma was introduced.

### Changes
- `src/services/CertificateRepository.ts`: replaced `update` with `upsert` in
  `markRevoked`. The `create` block seeds a minimal "legacy" row using `getTx` from
  `TxIndex` to recover the original `txHash` when available, falling back to `"legacy"`.
- Added `import { getTx } from "./TxIndex"` at the top of the file.
- `markClaimed` left unchanged: it is always called with a valid `claimToken` that was
  persisted at mint time, so the row is guaranteed to exist.

### Verification
- `tsc --noEmit` passes with 0 errors.

---


## feat(backend): add Prisma + SQLite certificate repository

### New files
- `prisma/schema.prisma` — Certificate model (tokenId, txHash, recipientName, recipientEmail, courseTitle, issuedAt, revokedAt, claimToken, claimExpiresAt, claimedAt, claimedBy, ipfsCid, ownerAddress)
- `prisma/migrations/20260603014003_init/migration.sql` — initial SQLite schema
- `prisma.config.ts` — Prisma v7 config file (datasource URL, dotenv integration)
- `src/services/CertificateRepository.ts` — singleton Prisma-backed repository with `save`, `findByTokenId`, `findAll`, `markRevoked`, `markClaimed`, `findByClaimToken`
- `src/routes/admin.ts` — GET /api/admin/certificates (x-api-key protected)
- `educert.db` — SQLite database file (in .gitignore)

### Updated files
- `src/routes/mint.ts` — direct-mint path now calls `certificateRepository.save()`; `saveTx` import removed
- `src/routes/revoke.ts` — calls `certificateRepository.markRevoked()` after on-chain revoke
- `src/routes/claim.ts` — calls `certificateRepository.markClaimed()` or `save()` on redemption; `saveTx` import removed
- `src/index.ts` — registered `/api/admin` router
- `.gitignore` — added `educert.db`, `educert.db-journal`
- `.env.example` — added `DATABASE_URL="file:./educert.db"`

### New endpoint

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | /api/admin/certificates | x-api-key | All certs ordered by issuedAt desc with `estado` field |

### `estado` field logic
- `"revogado"` — revokedAt is not null
- `"pendente"` — claimedAt is null (and not revoked)
- `"valido"` — claimedAt is not null (and not revoked)

### New environment variable
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite file path, e.g. `file:./educert.db` |

### Backward compatibility
- `tx-index.json` and `claims.json` are still written by the legacy code paths (`saveClaim` in claim-by-email, `associateWallet` in claim redemption). DB writes are non-fatal (try/catch with console.warn) so existing tokens 1–5 keep working.
- `GET /api/certificates?owner=` still reads `tx-index.json` for token discovery (unchanged).

### Tech notes
- Prisma v7 requires a driver adapter even for SQLite. Uses `@prisma/adapter-better-sqlite3`.
- `PrismaClient` constructor receives `{ adapter }` with `PrismaBetterSqlite3({ url: DATABASE_URL })`.
- `tsc --noEmit` passes with 0 errors.

---

## perf(backend): in-memory cache for IPFS metadata fetches

### Changes
- `services/MetadataCache.ts` (new): exports `ipfsToHttp` and `fetchMetadataWithCache`.
  Cache is a module-level `Map<string, object>` — same process lifetime, no TTL needed for a PoC.
  Fetch timeout raised to 15 s (IPFS gateways cold-start can take 10+ s).
- `routes/verify.ts`: replaced local `ipfsToHttp` + inline `fetch` with `fetchMetadataWithCache`.
- `routes/certificates.ts`: replaced local `ipfsToHttp` + inline `fetch` (5 s timeout) with
  `fetchMetadataWithCache`. Metadata fetches for multiple tokens remain parallel via `Promise.all`.

### Result
- Repeated `GET /api/verify/:tokenId` or `GET /api/certificates?owner=` calls for the same CID
  return the cached object without hitting the IPFS gateway again.
- `tsc --noEmit` passes with 0 errors.

---

## feat(verify): persist txHash in tx-index.json, remove unreliable queryFilter

### Root cause
`contract.queryFilter` on Sepolia is unreliable: providers cap the block range and
return empty arrays, leaving `txHash: null` in GET /api/verify/:tokenId responses.

### Changes
- `backend/src/services/TxIndex.ts` (new): file-based store (`tx-index.json`) with
  `saveTx(tokenId, txHash)` and `getTx(tokenId)` functions.
- `backend/src/routes/mint.ts`: calls `saveTx` after a successful direct-mint.
- `backend/src/routes/claim.ts`: calls `saveTx` after a successful claim mint.
- `backend/src/services/blockchain.ts`: `getCertificateInfo` now resolves `txHash`
  via `getTx` from TxIndex; the entire `queryFilter` try/catch block is removed.
- `.gitignore`: `tx-index.json` added (operational data, not source code).

### Result
- `tsc --noEmit` passes with 0 errors.
- GET /api/verify/:tokenId returns the correct `txHash` for any certificate minted
  after this change.

---

## fix(verify): explicit fromBlock range in queryFilter to resolve txHash null

### Root cause
`contract.queryFilter(filter)` with no block range causes Infura/Alchemy on Sepolia
to cap or reject the filter (providers limit results to ~10k blocks when no range is
given). The call silently returned an empty array, leaving `txHash` as `null`.

### Changes — `services/blockchain.ts`
- `getCertificateInfo`: fetches `currentBlock` from the provider before the filter
  call and sets `fromBlock = max(0, currentBlock - 100_000)`.
- `queryFilter` now called with explicit `(filter, fromBlock, "latest")`.
- Added `console.log("[verify] queryFilter events:", events.length)` for debugging.
- Added a fallback comment: if events remain empty, `provider.getTransactionReceipt`
  is the next option (requires the txHash stored off-chain, e.g. in the database).

---

## VerifyService hardening — ipfs gateway, txHash, email silent-fail

### Changes
- `services/email.ts`: `getClient()` now returns `null` instead of throwing when `RESEND_API_KEY` is absent; `sendClaimEmail` skips sending silently with a `console.warn`. This makes the email service truly non-fatal at the source, not only at the call site.
- `.env.example`: added a three-line comment block above `RESEND_API_KEY` documenting that the variable is optional and that the claim-by-email flow degrades gracefully without it.

### Verification
- `ipfsToHttp` was already applied before `fetch()` in `routes/verify.ts` (line 24) — no change needed.
- `txHash` from the mint Transfer event was already queried in `services/blockchain.ts` via `contract.queryFilter(Transfer(ZeroAddress, null, tokenId))` and included in `CertificateInfo` — no change needed.
- `tsc --noEmit` passes with 0 errors after the changes.

---

## QA FAILs — network label fix + test coverage for mint and claim routes

### Alteracoes
- `CLAUDE.md` (projeto): rede ja estava documentada como Sepolia — sem alteracao necessaria.
- `routes/mint.ts:155`: atributo `"Rede"` ja continha `"Sepolia"` — sem alteracao necessaria.
- `frontend/public/manifest.json`: description ja referenciava Sepolia — sem alteracao necessaria.
- `routes/mint.test.ts` (novo): 17 testes cobrindo auth (401), campos obrigatorios (400), ects/eqfLevel invalidos (400), walletAddress invalida (400), claim-by-email sem email (400), direct-mint happy path (201), claim-by-email happy path (201). Rate-limiter mockado para evitar 429 em testes sequenciais.
- `routes/claim.test.ts` (novo): 14 testes cobrindo GET 404 token inexistente, GET 200 sem email/studentIdHash na resposta, alreadyClaimed flag, POST 400 wallet invalida, POST 404 token inexistente, POST 409 already claimed, POST 201 happy path com mintCertificate mockado.

### Resultado
- 51 testes Vitest passam (4 ficheiros, 0 falhas)

---

## QA B2 — studentId internalization + frontend file-input fix

### Alteracoes
- `routes/mint.ts`: campo externo `studentIdHash` removido; substituido por `studentId` (texto puro). O backend computa `keccak256(toUtf8Bytes(studentId))` internamente — o valor nunca sai do servidor nem vai para IPFS.
- `routes/mint.ts`: importado `toUtf8Bytes` de ethers v6 ao lado de `keccak256`.
- `types/index.ts`: `MintRequest.studentIdHash` renomeado para `studentId`.
- `frontend/components/MintForm.tsx`: campo `studentIdHash` renomeado para `studentId`; label e placeholder atualizados; FormData envia `studentId`; campo marcado como obrigatorio.
- `frontend/components/MintForm.tsx`: `accept` do file input de imagens corrigido de `application/pdf,image/*` para `image/png,image/jpeg,image/webp`.
- `mint-test.json` na raiz do projeto deletado (arquivo stale de testes manuais).

### Regras respeitadas
- Dados pessoais NUNCA on-chain nem IPFS (studentId permanece apenas no servidor/BD)
- TypeScript compilavel sem erros

---

## Semana 2 — Multer, keccak256, claimed flag

### Alterações
- `routes/mint.ts`: hash de evidências migrado de `sha256` (Node crypto) para `keccak256` (ethers v6) — alinhado com padrão Ethereum
- `types/index.ts`: `ClaimRecord` ganha campos explícitos `walletAddress: string | null` e `claimed: boolean`
- `routes/mint.ts`: `ClaimRecord` criado com `walletAddress: null, claimed: false` explícitos
- `services/claims.ts`: `associateWallet` define `claimed = true` ao associar carteira
- `routes/claim.ts`: GET usa `record.claimed` em vez de `!!record.walletAddress`; POST verifica `record.claimed || record.walletAddress`

### Regras respeitadas
- Dados pessoais NUNCA on-chain nem IPFS
- TypeScript compila sem erros (`tsc --noEmit`)
- 20 testes Vitest passam

---

## Semana 1 — Upload de evidências + claim-by-email + Resend

### Novos endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/claim/:token | — | Preview certificado por claim token |
| POST | /api/claim/:token | — | Associa wallet + mint NFT |

### POST /api/mint actualizado

Aceita `multipart/form-data` com campos europeus completos:
- `recipientName`, `recipientEmail`, `courseTitle`, `courseId`, `studentIdHash`
- `issueDate`, `ects`, `eqfLevel` (1-8), `assessmentType`, `participationMode`, `learningOutcomes`
- `evidences[]` — ficheiros PDF/imagem (max 10MB, max 10 ficheiros)
- `evidenceTitles[]`, `evidenceTypes[]`
- `walletAddress` — opcional; omitido activa fluxo claim-by-email

### Novos serviços
- `claims.ts` — persistência claims.json com TTL 48h
- `email.ts` — Resend SDK, template HTML espanhol

### Variáveis adicionadas ao .env.example
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### Regras respeitadas
- Dados pessoais NUNCA on-chain nem IPFS
- TypeScript compila sem erros

---

## O que foi construído (Semana 0)

API Express/TypeScript para o EduCert.

### Endpoints implementados

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /health | — | Health check |
| POST | /api/mint | x-api-key | Upload IPFS + mint NFT (suporta `evidence[]`) |
| POST | /api/revoke | x-api-key | Revoga certificado |
| GET | /api/verify/:tokenId | — | Info pública do certificado |
| GET | /api/metadata/:tokenId | — | Metadata JSON (OpenSea-compatible) |

### Serviços

- **blockchain.ts** — ethers v6, minimal ABI, signer via PRIVATE_KEY
- **ipfs.ts** — Pinata SDK v2 (`pinata` npm package), `upload.public.json()` para metadata, `upload.public.file()` para evidências
- **mint.ts** — rota com rate-limit, validação Zod, suporte a `evidence[]`, log de erro estruturado

### Campo `evidence[]` no POST /api/mint

O body aceita um campo opcional `evidence`, array de objetos com:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | string | sim | Ex: "video", "document", "image", "link" |
| `title` | string | sim | Título descritivo da evidência |
| `url` | string (URL) | sim | URL de origem do arquivo |
| `hash` | string | não | Hash SHA256 do arquivo |
| `mimeType` | string | não | MIME type do arquivo |

Comportamento:
- Cada item em `evidence[]` tem seu arquivo buscado via `fetch` e enviado ao Pinata via `upload.public.file()`.
- A `url` de cada item é substituída pelo `ipfs://` CID retornado.
- Se o upload de uma evidência falhar, o erro é logado mas o mint continua com a `url` original como fallback.
- O array `evidence` (com URLs já no IPFS) é incluído no JSON de metadado final antes do upload do JSON.

### Segurança

- API key via `x-api-key` header nas rotas de escrita
- Helmet + CORS restrito à origem configurada em `FRONTEND_URL`
- Rate limit de 10 req/min no mint
- Validação com Zod
- Dados pessoais NUNCA no IPFS — só hash opaco de studentId + info do curso

### Variáveis de ambiente necessárias

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor (padrão: 3001) |
| `PINATA_JWT` | JWT de autenticação da Pinata (SDK `pinata` v2+) |
| `RPC_URL` | URL do nó RPC (ex: Sepolia) |
| `PRIVATE_KEY` | Chave privada da carteira issuer |
| `CONTRACT_ADDRESS` | Endereço do contrato EduCert deployado |
| `API_KEY` | Chave para autenticar rotas de escrita (x-api-key) |
| `FRONTEND_URL` | Origem permitida pelo CORS (ex: http://localhost:3000) |

### Correções aplicadas

- **verify.ts** — adicionada função `ipfsToHttp` (module-level, não exportada) que converte `ipfs://` para `https://gateway.pinata.cloud/ipfs/`. O fetch de metadata agora usa essa função em vez da conversão inline anterior, resolvendo falhas silenciosas quando o tokenURI usava o protocolo `ipfs://`.

### Como rodar

```bash
cp .env.example .env
# preencher .env
npm install
npm run dev
```
