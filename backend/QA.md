# QA Report — Prisma + SQLite Integration

**Date:** 2026-06-02  
**Method:** Static analysis + `vitest run` (51 tests) + SQLite direct inspection

---

## Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | POST /api/mint → registo criado no SQLite | **PASS** (ressalva: falha silenciosa se save() falhar) |
| 2 | POST /api/revoke → revokedAt actualizado | **PASS** (issue crítico: P2025 para tokens sem registo) |
| 3 | POST /api/claim/:token → claimedAt + claimedBy | **PASS** |
| 4 | GET /api/admin/certificates → lista + estados | **PASS** |
| 5 | educert.db no .gitignore | **PASS** |
| 6 | tx-index.json + claims.json backward compat | **PASS** (tokens antigos invisíveis em /admin/certificates) |
| 7 | Dados pessoais fora de on-chain e IPFS | **PASS** |
| 8 | Sem breaking changes nos endpoints existentes | **PASS** |

---

## Testes Automatizados

```
Test Files  4 passed (4)
Tests       51 passed (51)
Duration    1.07s
```

---

## Issues Identificados

### Issue 1 — CRÍTICO: `markRevoked` lança P2025 para tokens sem registo SQLite

**Ficheiro:** `src/services/CertificateRepository.ts`

`prisma.certificate.update()` falha com `P2025` quando `tokenId` não existe na tabela. Afecta:
- Tokens emitidos antes da migração (1-5 em `tx-index.json`)
- Tokens do fluxo `claim-by-email` ainda não reclamados

Resultado: blockchain revogado, SQLite dessincronizado — o endpoint retorna sucesso mas `revokedAt` não fica gravado.

**Fix recomendado:**
```ts
async markRevoked(tokenId: number): Promise<void> {
  await this.prisma.certificate.upsert({
    where: { tokenId },
    update: { revokedAt: new Date() },
    create: {
      tokenId,
      txHash: "",
      recipientName: "",
      courseTitle: "",
      ipfsCid: "",
      revokedAt: new Date(),
    },
  });
}
```

---

### Issue 2 — MÉDIO: `schema.prisma` sem `url` no datasource

**Ficheiro:** `prisma/schema.prisma`

URL injectada via `prisma.config.ts` — funciona em runtime mas quebra `prisma migrate deploy` directo em CI/CD.

---

### Issue 3 — BAIXO: `/admin/certificates` expõe `recipientName`

Campo pessoal exposto na resposta admin. Endpoint protegido por API key — aceitável em PoC, avaliar para produção (RGPD).

---

### Issue 4 — BAIXO: `claims.json` armazena `recipientEmail` em texto claro

Ficheiro no `.gitignore` (risco de exposição via repositório mitigado). Risco subsiste se o ficheiro for lido por outro processo.

---

## Evidências de Segurança

- Payload IPFS: contém apenas `courseTitle`, `courseId`, `studentIdHash` (keccak256), `issueDate`, campos académicos. **Sem `recipientEmail`, `recipientName`, nem `studentId` em claro.**
- `studentId` hashado localmente antes de qualquer saída (comentário explícito no código).
- `educert.db` confirmado como não rastreado pelo git.

---

## Veredicto Final

**PASS com condições**

Sistema funcional para fluxo principal (mint directo → claim → admin). Issue 1 deve ser corrigido antes de produção para evitar dessincronização SQLite/blockchain em revogações de tokens históricos.
