# Backend — DONE

## O que foi construído

API Express/TypeScript para o EduCert.

### Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /health | — | Health check |
| POST | /api/mint | x-api-key | Upload IPFS + mint NFT (suporta `evidence[]`) |
| POST | /api/revoke | x-api-key | Revoga certificado |
| GET | /api/verify/:tokenId | — | Info pública do certificado |
| GET | /api/metadata/:tokenId | — | Metadata JSON (OpenSea-compatible) |

### Serviços

- **blockchain.ts** — ethers v6, minimal ABI, signer via PRIVATE_KEY
- **ipfs.ts** — @pinata/sdk, `pinJSONToIPFS` para metadata, `pinFileToIPFS` para evidências

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
- Cada item em `evidence[]` tem seu arquivo buscado via `fetch` e enviado ao Pinata via `pinFileToIPFS`.
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
| `PINATA_API_KEY` | Chave de API da Pinata |
| `PINATA_SECRET_KEY` | Chave secreta da Pinata |
| `RPC_URL` | URL do nó RPC (ex: Polygon Amoy) |
| `PRIVATE_KEY` | Chave privada da carteira issuer |
| `CONTRACT_ADDRESS` | Endereço do contrato EduCert deployado |
| `API_KEY` | Chave para autenticar rotas de escrita (x-api-key) |
| `FRONTEND_URL` | Origem permitida pelo CORS (ex: http://localhost:3000) |

### Como rodar

```bash
cp .env.example .env
# preencher .env
npm install
npm run dev
```
