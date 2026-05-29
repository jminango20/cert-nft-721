# Backend — DONE

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
