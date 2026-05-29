---
name: commit-convention
description: Skill para criar commits seguindo Conventional Commits. Usar sempre antes de qualquer git commit no projeto EduCert.
---

# Como fazer commit neste projeto

## Formato obrigatório
<tipo>(<escopo>): <descrição curta em inglês>

## Regras estritas
- APENAS a primeira linha — sem corpo, sem rodapé, sem explicações
- Máximo 72 caracteres
- Inglês, minúsculas, sem ponto final
- NUNCA adicionar Co-Authored-By ou qualquer rodapé
- NUNCA usar heredoc ou $(cat ...) — apenas git commit -m "mensagem"

## Tipos e escopos
- feat/fix/test/docs/chore/refactor/security
- escopos: contracts, backend, frontend, agents, config

## Exemplos corretos
chore(config): migrate network from Polygon Amoy to Sepolia
feat(contracts): add CertificateNFT soulbound ERC-721
fix(backend): restrict CORS to frontend domain

## Comando exato
```bash
git add <arquivos>
git commit -m "chore(config): migrate network from Polygon Amoy to Sepolia"
```
