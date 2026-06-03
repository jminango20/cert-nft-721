# Frontend — DONE

## Sesion actual (2026-06-02) — Modo presentacion pantalla completa en /verify/[tokenId]

### Cambios

| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `components/VerifyPresentMode.tsx` | Nuevo | Overlay cliente de pantalla completa; lee `?present=true` con `useSearchParams`; muestra badge de estado, titulo, institucion, fecha, campos academicos y QR 200x200; boton "Salir" llama `document.exitFullscreen()` y elimina el param de la URL; salida tambien con tecla Escape |
| `app/verify/[tokenId]/page.tsx` | Actualizado | Importa `VerifyPresentMode` envuelto en `<Suspense>`; precalcula props en el Server Component y las pasa al cliente; la pagina normal permanece intacta cuando `present` no esta en la URL |
| `components/CertificateListCard.tsx` | Actualizado | Anadido boton "Presentar" (solo en certificados validos); llama `router.push(/verify/[tokenId]?present=true)` y `document.documentElement.requestFullscreen()` desde el mismo gesto de usuario |

### Comportamiento implementado

- `?present=true` activa overlay `fixed inset-0 z-50 bg-white` que cubre header/footer/nav
- Overlay muestra unicamente: badge de estado, titulo, institucion, fecha, ECTS/EQF/Modalidad/Evaluacion, QR 200x200
- Boton "Salir" (esquina superior derecha): llama `exitFullscreen` y hace `router.replace` sin el query param
- Tecla Escape cierra la presentacion con el mismo efecto
- `requestFullscreen` se llama desde el clic del boton "Presentar" (gesto de usuario); si el navegador lo deniega la pagina de presentacion se muestra de todas formas
- Sin `?present=true` el componente devuelve `null` — comportamiento normal sin cambios
- Pagina /verify sigue siendo SSR; `VerifyPresentMode` usa `useSearchParams` correctamente con `<Suspense>`

### Dependencias anadidas

Ninguna nueva — `qrcode.react` y `next/navigation` ya estaban en el proyecto.

---

## Sesion actual (2026-06-02) — Descarga de certificado en PDF

### Cambios

| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `components/CertificatePDF.tsx` | Nuevo | Documento React-PDF con layout ISTER: logo, titulo, nombre del participante, microcredencial, ECTS/EQF/Modalidad/Fecha, emisor, QR code y pie blockchain |
| `components/CertificateDownloadButton.tsx` | Nuevo | Boton cliente que genera QR con `qrcode` y renderiza `PDFDownloadLink` de `@react-pdf/renderer`; usa `useEffect` para el QR data URL |
| `components/VerifyDownloadButton.tsx` | Nuevo | Thin wrapper `"use client"` con `dynamic(..., {ssr:false})` para inyectar el boton de descarga en la pagina SSR `/verify/[tokenId]` |
| `components/CertificateListCard.tsx` | Actualizado | Importa `CertificateDownloadButton` via `dynamic` con `ssr:false`; acepta prop `studentName?`; muestra boton "Descargar PDF" en certificados no revocados |
| `app/aluno/page.tsx` | Actualizado | Calcula `studentName` desde Privy (nombre Google > email > "Participante"); lo pasa a `CertificateListCard` |
| `app/verify/[tokenId]/page.tsx` | Actualizado | Importa `VerifyDownloadButton`; muestra seccion "Descargar Certificado" para certificados validos |

### Comportamiento implementado

- Nombre del alumno: viene de Privy (Google name o email) en `/aluno`; en `/verify` se usa "Participante" (datos personales nunca on-chain ni en IPFS)
- QR en el PDF: generado client-side con `qrcode.toDataURL`, apunta a `https://educert.vercel.app/verify/[tokenId]`
- Nombre del archivo: `certificado-[tokenId]-ISTER.pdf`
- Compatible SSR: `@react-pdf/renderer` cargado solo en cliente via `next/dynamic` con `{ssr:false}`
- Botones no aparecen en certificados revocados

### Dependencias anadidas

| Paquete | Version | Uso |
|---------|---------|-----|
| `@react-pdf/renderer` | ^4.x | Generacion de PDF en cliente |
| `qrcode` | ^1.x | QR code como data URL para incrustar en PDF |
| `@types/qrcode` | ^1.x | Tipos TypeScript para qrcode |

---

## Sesion actual (2026-06-02) — Dashboard admin com lista de certificados

### Cambios

| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `app/admin/page.tsx` | Actualizado | Aniadido sistema de tabs: "Emitir Certificado" (layout existente) y "Ver Dashboard" (nueva CertificateTable) |
| `components/CertificateTable.tsx` | Nuevo | Tabla de certificados con filtro por estado (dropdown), busqueda por nombre, badge de estado (Valido/Pendente/Revogado), accion Ver (nueva pestana) y Revogar (confirm dialog + actualizacion local sin reload) |
| `app/api/admin/certificates/route.ts` | Nuevo | Route handler Next.js — proxy a `GET /api/admin/certificates` con API key server-side (no expuesta al cliente) |

### Comportamiento implementado

- Filtro por estado: Todos / Validos / Pendentes de claim / Revogados
- Busqueda en tiempo real por nombre del destinatario
- Badge de estado: verde (valido), amarelo (pendente), rojo (revogado)
- Fecha formateada con `toLocaleDateString('es-ES')` en columna Emision
- Revogar: confirm dialog → `POST /api/revoke` → fila pasa a rojo sin reload
- Boton Revogar desaparece tras revocar; solo queda Ver
- Wallet del alumno nunca expuesta (columna Nombre, no direccion)

### Dependencias anadidas

Ninguna nueva.

---

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
