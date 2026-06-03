# EduCert — PoC de Certificados Educativos com NFT

## O que é este projeto
Sistema de emissão de microcredenciais educativas como NFTs soulbound (ERC-721)
na rede Sepolia. Backend Node/TypeScript, frontend Next.js 14 PWA.

## Stack
- Contratos: Solidity 0.8.24, OpenZeppelin 5, Hardhat, TypeScript
- Backend: Node.js, Express, TypeScript, ethers v6, Pinata SDK
- Frontend: Next.js 14 App Router, TypeScript, wagmi v2, Privy, next-pwa
- Rede: Sepolia testnet
- Storage: IPFS via Pinata (PoC), Arweave/Irys (produção futura)

## Regras absolutas
- Nunca commitar chaves privadas ou .env
- Todo contrato deve ter testes antes de deploy
- Soulbound: transferências sempre revertidas (_update override)
- Dados pessoais do aluno NUNCA vão on-chain nem no IPFS
- tokenURI aponta sempre para IPFS CID imutável

## Estrutura de pastas
contracts/   → Solidity + Hardhat + scripts de deploy
backend/     → API Express com serviços mint, revoke, verify, metadata
frontend/    → Next.js PWA (admin + aluno + verify público)

## Identidade dos agentes
Quando um agente terminar uma tarefa, ele deve deixar um resumo
em DONE.md na pasta que trabalhou.