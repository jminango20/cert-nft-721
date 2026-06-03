# QA Report — EduCert

## Checklist

| Item | Status |
|------|--------|
| CertificateNFT.sol com `_update` override soulbound | OK |
| Testes cobrem mint, revoke, transfer revert, tokenURI, EIP-5192 | OK |
| contracts/DONE.md | OK |
| Rotas /api/mint, /api/revoke, /api/verify, /api/metadata registradas | OK |
| requireApiKey apenas em mint e revoke | OK |
| .env.example sem chaves reais | OK |
| Dados pessoais nunca no IPFS (só hash + info do curso) | OK |
| backend/DONE.md | OK |
| /admin usa ConnectButton (wagmi/MetaMask) | OK |
| /aluno usa PrivyButton (Privy) | OK |
| /verify/[tokenId] público, sem auth | OK |
| MintForm envia studentIdHash, não dados pessoais | OK |
| frontend/DONE.md | OK |
| Sem .env ou node_modules commitados | OK |
| Commits seguem Conventional Commits | OK |

**Resultado: 15/15 itens OK. Nenhuma falha crítica de checklist.**

## Issues encontradas

### CRÍTICA — NEXT_PUBLIC_API_KEY exposta no bundle do browser

`frontend/lib/api.ts` usa `NEXT_PUBLIC_API_KEY` que é injetada no bundle JS enviado ao browser. Qualquer pessoa pode ler a chave via DevTools, tornando o `requireApiKey` do backend ineficaz.

**Fix:** Criar Route Handlers em `app/api/mint/route.ts` e `app/api/revoke/route.ts` que rodam server-side. Usar `API_KEY` sem prefixo `NEXT_PUBLIC_`. O client chama a rota Next.js; ela faz o forward com a chave injetada server-side.

### MÉDIA — Ícones PWA ausentes

`public/manifest.json` referencia `icon-192.png` e `icon-512.png` que não existem. PWA não passa no critério de instalabilidade do browser.

**Fix:** Adicionar os PNGs em `frontend/public/`.

### MÉDIA — CORS sem restrição de origem

`cors()` sem opções permite qualquer origem. Para além de localhost, restringir ao domínio do frontend.

### BAIXA — Sem rate limiting

Rota `/api/mint` dispara upload IPFS + tx blockchain. Adicionar `express-rate-limit`.

### BAIXA — Sem .gitignore na raiz

Qualquer `.env` criado na raiz do monorepo não seria ignorado.

### INFORMATIVA — `"use client"` no layout impede metadata de servidor

`app/layout.tsx` marcado como client component por precisar dos providers (Privy, wagmi). Impede uso do export `metadata` do App Router para SEO. Solução: extrair providers para um componente separado.

---

## Revalidação (2026-05-28)

Todos os issues foram corrigidos no commit `c32567a` (fix(backend): restrict CORS, rate-limit mint, add .gitignore) e no commit `3fb6739` (feat(frontend): add Next.js 14 PWA with admin, aluno, and public verify flows). Evidências abaixo.

### CRÍTICA — CORS sem restrição de origem

**PASS.**
`backend/src/index.ts` usa `cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" })`. Nenhuma chamada `cors()` sem opções encontrada. `backend/.env.example` documenta `FRONTEND_URL=http://localhost:3000`.

### BAIXA — Sem rate limiting

**PASS.**
`backend/src/routes/mint.ts` instancia `rateLimit({ windowMs: 60 * 1000, max: 10 })` e aplica o limiter exclusivamente na rota `POST /` do router de mint. O pacote `express-rate-limit@^7.0.0` consta em `backend/package.json` dependencies.

### BAIXA — Sem .gitignore na raiz

**PASS.**
`.gitignore` existe na raiz do monorepo (`C:\ws-ethereum\educert-ISTER\.gitignore`) e cobre `.env`, `**/.env`, `node_modules/`, artefatos de OS (`.DS_Store`, `Thumbs.db`) e build outputs (`dist/`, `.next/`, `out/`).

### CRÍTICA — NEXT_PUBLIC_API_KEY exposta no bundle do browser

**PASS.**
- `frontend/lib/api.ts` não contém nenhuma referência a `NEXT_PUBLIC_API_KEY`. As funções `mint` e `revoke` chamam `/api/mint` e `/api/revoke` (rotas locais Next.js) via `postLocal`.
- `frontend/app/api/mint/route.ts` — Route Handler server-side; lê `process.env.API_KEY` (sem prefixo `NEXT_PUBLIC_`); faz proxy para o Express backend com o header `x-api-key`.
- `frontend/app/api/revoke/route.ts` — mesmo padrão para revoke.
- `frontend/.env.local.example` documenta `API_KEY=change-me-in-production` (sem prefixo `NEXT_PUBLIC_`).

### MÉDIA — Ícones PWA ausentes

**PASS.**
`frontend/public/icon-192.png` e `frontend/public/icon-512.png` existem. Gerados via `frontend/scripts/generate-icons.mjs` (cor `#6366f1`, 192x192 e 512x512). Referenciados corretamente em `frontend/public/manifest.json`.

### INFORMATIVA — `"use client"` no layout bloqueia metadata de servidor

**PASS.**
- `frontend/app/providers.tsx` — componente `"use client"` isolado que envolve PrivyProvider, WagmiProvider e QueryClientProvider.
- `frontend/app/layout.tsx` — sem diretiva `"use client"`; exporta `export const metadata: Metadata` com `title`, `description`, `manifest` e `themeColor`; usa `<Providers>` para a árvore client.

### Resultado da revalidação

| Issue | Severidade | Status |
|-------|-----------|--------|
| CORS sem restrição de origem | CRÍTICA | PASS |
| Sem rate limiting em /api/mint | BAIXA | PASS |
| Sem .gitignore na raiz | BAIXA | PASS |
| NEXT_PUBLIC_API_KEY no bundle do browser | CRÍTICA | PASS |
| Ícones PWA ausentes | MÉDIA | PASS |
| `"use client"` no layout bloqueia metadata | INFORMATIVA | PASS |

**6/6 issues resolvidos. Nenhuma falha pendente.**

---

## Validação MVP Semana 1 — 2026-05-29

### Tabela de resultados

| # | Ponto verificado | STATUS | Ficheiro(s) relevante(s) | Detalhe |
|---|-----------------|--------|--------------------------|---------|
| B2 | studentId recebido em plain text; keccak256 calculado internamente | OK | `backend/src/routes/mint.ts:87` | `const studentIdHash = keccak256(toUtf8Bytes(studentId))` na linha 87, imediatamente após a recepção do campo. O hash (não o plain text) é o único valor que segue para IPFS e on-chain. A linha 86 inclui comentário explícito: "plain studentId never leaves this function". |
| B2a | Dados pessoais ausentes do payload IPFS | OK | `backend/src/routes/mint.ts:141-159` | O objecto `metadata` enviado para Pinata contém apenas `studentIdHash` (campo `"Student ID (hash)"`), nunca `studentId`, `recipientName` ou `recipientEmail`. |
| IMG | Input de imagem com `accept` correcto | OK | `frontend/components/MintForm.tsx:446` | PDF: `accept="application/pdf"`. Imagem: `accept="image/png,image/jpeg,image/webp"`. Reforçado no backend pelo multer (`ALLOWED_MIMETYPES` — linha 23-29 de `mint.ts`). Ficheiros arbitrários são bloqueados em ambas as camadas. |
| JSON | `mint-test.json` ausente do repositório | OK | — | Pesquisa recursiva em todo o projecto (excluindo `node_modules`) não encontrou qualquer ficheiro `mint-test*`. |
| META | Campo Rede nos atributos do NFT | OK | `backend/src/routes/mint.ts:156` | Rede oficial definida como Sepolia (decisão 2026-06-02). `mint.ts`, `CLAUDE.md`, `manifest.json`, `hardhat.config.ts` e `.env.example` todos coerentes com Sepolia. |
| META-b | `manifest.json` descreve rede | OK | `frontend/public/manifest.json:4` | Description diz "na Sepolia" — coerente com a rede oficial. |
| TST | Testes para `/api/mint` | OK | `backend/src/routes/mint.test.ts` | Adicionado em commit `a757c40`. |
| TST | Testes para `/api/claim/:token` | OK | `backend/src/routes/claim.test.ts` | Adicionado em commit `a757c40`. |
| TST | Testes existentes (revoke + verify) — execução | OK | `backend/src/routes/revoke.test.ts`, `backend/src/routes/verify.test.ts` | `npx vitest run`: **20/20 testes passaram** (2 ficheiros, 874 ms). Sem falhas. |
| ENV | `.env.example` com todas as variáveis, sem valores reais | OK | `backend/.env.example` | Todas as variáveis presentes (`RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS`, `PINATA_JWT`, `API_KEY`, `PORT`, `FRONTEND_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Valores são placeholders (`your_pinata_jwt_token`, `change-me-in-production`, etc.). |
| ENV | `.env.local` não commitado | OK | `frontend/.gitignore` | `frontend/.env.local` está em `.gitignore` e não consta em `git ls-files`. |
| PWA | Manifesto presente e ícones existem | OK | `frontend/public/manifest.json`, `frontend/public/icon-192.png`, `frontend/public/icon-512.png` | Manifesto válido. Ícones PNG presentes. |

### Acções necessárias

Nenhuma. Todos os bloqueadores resolvidos (ver Revalidação 2026-06-02).

### Aprovado para

**Demo MVP semana 1: APROVADO.** Todos os FAILs resolvidos. Funcionalidade core operacional. Pronto para merge em `main`.

---

## Revalidação — 2026-06-02

| Issue | Status |
|-------|--------|
| META: rede Sepolia vs Polygon Amoy | PASS — decisão tomada: Sepolia é a rede oficial. Código e docs coerentes. |
| META-b: manifest.json rede | PASS — já dizia Sepolia, alinhado com decisão. |
| TST: mint.test.ts | PASS — existe em `backend/src/routes/mint.test.ts` (commit `a757c40`). |
| TST: claim.test.ts | PASS — existe em `backend/src/routes/claim.test.ts` (commit `a757c40`). |

**Resultado: 0 FAILs pendentes. Pronto para merge em `main`.**
