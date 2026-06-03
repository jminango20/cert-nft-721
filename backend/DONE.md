# Backend — DONE

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
