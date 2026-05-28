---
name: commit-convention
description: Skill para criar commits seguindo Conventional Commits. Usar sempre antes de qualquer git commit no projeto EduCert.
---

# Como fazer commit neste projeto

## Formato obrigatório
<tipo>(<escopo>): <descrição curta em inglês>
[corpo opcional]
[rodapé opcional]

## Tipos permitidos
- feat     → nova funcionalidade
- fix      → correção de bug
- test     → adição ou correção de testes
- docs     → documentação
- chore    → config, deps, build
- refactor → refatoração sem mudança de comportamento
- security → correção de segurança

## Escopos do projeto
- contracts  → tudo em contracts/
- backend    → tudo em backend/
- frontend   → tudo em frontend/
- agents     → arquivos em .claude/
- config     → hardhat, tsconfig, next.config

## Exemplos
feat(contracts): add CertificateNFT soulbound ERC-721
test(contracts): add transfer revert and revoke coverage
feat(backend): add mint endpoint with Pinata upload
feat(frontend): add /verify public page with QR code
chore(config): add Polygon Amoy network to hardhat config
security(contracts): restrict mint to ISSUER_ROLE only

## Regras
- Descrição em inglês, minúsculas, sem ponto final
- Máximo 72 caracteres na primeira linha
- Nunca commitar: .env, chaves privadas, node_modules
- Um commit por responsabilidade — não mistura contrato com frontend

## Procedimento
1. `git status` — revisa o que mudou
2. `git diff --staged` — confirma o que vai entrar
3. Monta a mensagem seguindo o formato acima
4. `git commit -m "<mensagem>"`
