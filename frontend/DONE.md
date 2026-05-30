# Frontend — DONE

## Sesion actual (2026-05-29) — Rediseno /aluno: auto-carga por wallet, sin campo Token ID

### Cambios

| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `app/aluno/page.tsx` | Actualizado | Reescrito: auto-carga certificados via `GET /api/certificates?owner=`, elimina campo de busca manual por Token ID |
| `components/CertificateListCard.tsx` | Nuevo | Card con titulo, institucion, fecha en espanol, badge Valido/Revocado, ECTS, botones "Ver certificado completo", "Compartir" (copia URL al portapapeles) y "Codigo QR" (modal) |
| `lib/api.ts` | Actualizado | Anadida interfaz `OwnedCertificate` y metodo `api.getCertificatesByOwner(owner)` |
| `backend/src/routes/certificates.ts` | Nuevo | `GET /api/certificates?owner=0x...` — lee tx-index.json, filtra por `ownerOf`, devuelve metadata IPFS + isRevoked + txHash por cada token |
| `backend/src/services/TxIndex.ts` | Actualizado | `readAll()` exportada como publica |
| `backend/src/index.ts` | Actualizado | Registra `certificatesRouter` en `/api/certificates` |

### Problemas resueltos

1. **Token ID oculto** — el alumno ya no necesita conocer ni introducir ningun ID tecnico.
2. **Campos vacios** — atributos leidos con `getAttribute` de `attributeHelper` (normalizacion NFD, busca por substring).
3. **Fecha legible** — formateada con `toLocaleDateString("es-ES", { day, month: "long", year })`.
4. **QR modal** — abre un dialogo centrado con `QRCodeSVG` apuntando a `/verify/[tokenId]`.
5. **Compartir** — copia `{origin}/verify/{tokenId}` al portapapeles con feedback visual.

### Dependencias anadidas

Ninguna nueva — `qrcode.react` ya estaba instalado.

---

## Sesion anterior (2026-05-29) — Fix /verify: atributos con acento, evidencias PDF, layout

### Cambios

| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `lib/attributeHelper.ts` | Nuevo | Funcion `getAttribute` con normalizacion NFD, busca traits por substring sin importar acentos |
| `app/verify/[tokenId]/page.tsx` | Actualizado | Usa `getAttribute` de `attributeHelper`; orden de secciones corregido (Estado → Detalles → Evidencias → Blockchain → QR); fecha con mes largo en el header del estado |
| `components/EvidenceList.tsx` | Actualizado | PDF muestra boton "Ver PDF" (target=_blank) + boton "Descargar" (con `download`); thumbnail de imagen 80x80px fijo |

### Problemas resueltos

1. **Atributos vacios** — `getAttribute` normaliza Unicode NFD y elimina diacriticos antes de comparar; "Fecha de emision", "Creditos ECTS", "Tipo de Evaluacion" ahora se encuentran aunque el metadato use "Fecha de emisión", "Créditos ECTS", "Tipo de Evaluación".
2. **PDF y evidencias** — URLs `ipfs://` ya se resolvian a Pinata gateway; ahora PDFs tienen dos botones separados: "Ver PDF" abre en nueva pestana y "Descargar" usa `download` attribute. Imagenes muestran thumbnail 80x80.
3. **Layout** — Orden de secciones alineado con el diseno: Estado → Detalles Academicos → Evidencias → Prueba Blockchain → QR. TX hash aparece antes de la direccion del contrato en la seccion blockchain.

---

## Sesion anterior (2026-05-29) — Rediseno completo UI en espanol

### Paginas actualizadas / creadas

| Ruta | Estado | Cambios |
|------|--------|---------|
| `/` | Actualizada | Todo el texto en espanol |
| `/admin` | Actualizada | MintForm con 3 modos de entrega, CertDashboard con filtros y revocacion via wagmi |
| `/aluno` | Actualizada | Todo el texto en espanol, wallet no expuesta |
| `/verify` | Actualizada | Texto en espanol |
| `/verify/[tokenId]` | Actualizada | Secciones: Estado, Detalles Academicos, Prueba Blockchain, Evidencias, QR code |
| `/claim/[token]` | Sin cambios | Ya estaba en espanol y funcional |

### Componentes nuevos

- `components/QRCodeSection.tsx` — componente cliente que renderiza QR code con `qrcode.react`

### Componentes actualizados

| Componente | Cambios |
|-----------|---------|
| `MintForm` | Tercer modo "Link de claim" (sin email); ECTS min 0.5; muestra claim URL en exito |
| `CertDashboard` | Reescrito con viem (sin ethers); filtros por wallet/curso/ID; filtro estado; revocacion via wagmi `writeContract` |
| `CertificateCard` | Texto en espanol; wallet no expuesta; link a /verify |
| `PrivyButton` | Texto en espanol; no muestra wallet del alumno |
| `EvidenceList` | Texto en espanol (labels, mensajes de verificacion de hash) |

### Lib actualizada

- `lib/contractAbi.ts` — anadida funcion `revoke(uint256)` + alias `contractAbi`

### Variables de entorno

Anadida `NEXT_PUBLIC_APP_URL` a `.env.example` y `.env.local.example` (necesaria para generar la URL del QR en SSR).

### Dependencias anadidas

| Paquete | Version | Uso |
|---------|---------|-----|
| `qrcode.react` | ^4.2.0 | QR code en /verify/[tokenId] |

### Reglas respetadas

- Todo el texto de la UI en espanol
- Wallet del alumno nunca visible para terceros (PrivyButton muestra solo email, CertificateCard no muestra owner)
- /verify/[tokenId] funciona sin JavaScript (SSR con Next.js App Router, QRCodeSection es el unico fragmento cliente)
- QR code apunta a /verify/[tokenId]
- Build Next.js pasa sin errores de TypeScript

### Pendiente / fuera de alcance

- Red configurada como Sepolia (cambio a Polygon Amoy pendiente segun instruccion del usuario)
- TX hash en CertDashboard no disponible sin enriquecer los eventos on-chain con datos del backend
- Paginacion en CertDashboard si hay muchos certificados

---

## Semana 1 — Formulario admin completo, /claim/[token], /verify en espanol

### Nuevas paginas
| Rota | Descripcion |
|------|-------------|
| `/claim/[token]` | Preview certificado + login Privy + reclamacion NFT |

### Paginas actualizadas
| Rota | Cambios |
|------|---------|
| `/admin` | Formulario completo europeo en espanol, toggle wallet/email, seccion evidencias, dashboard |
| `/verify/[tokenId]` | Todo en espanol, seccion "Prueba Blockchain", evidencias con hash + descarga |

### Componentes nuevos / actualizados
- `MintForm` — formulario completo: recipientName, email, courseTitle, courseId, ISTER (fijo), pais, fecha, learningOutcomes, ECTS, EQF (1-8), assessmentType, modalidad, evidencias con upload PDF/imagen
- `RevokeForm` — traducido al espanol
- `CertDashboard` — dashboard con lista de certificados emitidos via Transfer events (ethers v5)
- `ClaimPage` — /claim/[token]: preview, login Privy, POST claim con walletAddress

### Proxy API routes
- `app/api/claim/[token]/route.ts` — GET/POST proxy al backend /api/claim/:token

### .env.example creado
- `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_RPC_URL` anadidos

### Reglas respetadas
- Todo el UI en espanol
- Wallet nunca mostrada al usuario en flujo email
- TypeScript compila sin errores

---

## O que foi construido (semanas anteriores)

Next.js 14 App Router PWA com tres fluxos de uso.

### Paginas

| Rota | Fluxo | Descricao |
|------|-------|-----------|
| `/` | — | Landing page com links para os 3 fluxos |
| `/admin` | Admin (MetaMask/wagmi) | Emitir + revogar certificados |
| `/aluno` | Aluno (Privy) | Buscar e visualizar certificado proprio |
| `/verify` | Publico | Formulario de busca por Token ID |
| `/verify/[tokenId]` | Publico | Detalhe com status VALIDO / REVOGADO |

### Componentes

- `MintForm` — formulario de emissao com hash de studentId
- `RevokeForm` — revogacao com confirmacao em dois cliques
- `CertificateCard` — exibe certificado (curso, status, datas)
- `ConnectButton` — MetaMask via wagmi
- `PrivyButton` — login via Privy (e-mail ou carteira)

### Libs

- `wagmiConfig.ts` — Polygon Amoy chain config
- `privyConfig.ts` — Privy login methods
- `api.ts` — wrappers fetch para o backend
- `contractAbi.ts` — ABI minima para leituras on-chain

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

- Created `app/api/mint/route.ts` — Next.js Route Handler que lee `API_KEY`
  desde `process.env.API_KEY` (server-only) y hace proxy POST al Express backend.
- Created `app/api/revoke/route.ts` — mismo patron para revoke.
- Updated `lib/api.ts` — `mint` y `revoke` ahora llaman `/api/mint` y `/api/revoke`
  (rutas locales Next.js); `NEXT_PUBLIC_API_KEY` eliminado.
- Updated `.env.local.example` — reemplazado `NEXT_PUBLIC_API_KEY` con `API_KEY`.

### Issue 2 — PWA icons created

- Added `scripts/generate-icons.mjs` — script Node sin dependencias.
- Generated `public/icon-192.png` y `public/icon-512.png`.

### Issue 4 — Evidence section on verify page

- Created `components/EvidenceList.tsx` — componente cliente con verificacion de hash keccak256 via `viem`.

### Issue 3 — layout.tsx is now a server component

- Created `app/providers.tsx` (`"use client"`) — envuelve PrivyProvider, WagmiProvider, QueryClientProvider.
- Rewrote `app/layout.tsx` — sin `"use client"`; exporta `metadata` y `viewport`.

---

## Build fixes (2026-05-29)

### Fix 1 — webpack alias for React Native async-storage

- Added `webpack` callback in `next.config.js`.

### Fix 2 — separate `viewport` export in layout.tsx

- Extraido `themeColor` a `export const viewport: Viewport`.
