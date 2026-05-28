# Backend — DONE

## O que foi construído

API Express/TypeScript para o EduCert.

### Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /health | — | Health check |
| POST | /api/mint | x-api-key | Upload IPFS + mint NFT |
| POST | /api/revoke | x-api-key | Revoga certificado |
| GET | /api/verify/:tokenId | — | Info pública do certificado |
| GET | /api/metadata/:tokenId | — | Metadata JSON (OpenSea-compatible) |

### Serviços

- **blockchain.ts** — ethers v6, minimal ABI, signer via PRIVATE_KEY
- **ipfs.ts** — @pinata/sdk, pinJSONToIPFS

### Segurança

- API key via `x-api-key` header nas rotas de escrita
- Helmet + CORS
- Validação com Zod
- Dados pessoais NUNCA no IPFS — só hash opaco de studentId + info do curso

### Como rodar

```bash
cp .env.example .env
# preencher .env
npm install
npm run dev
```
