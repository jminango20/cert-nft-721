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
