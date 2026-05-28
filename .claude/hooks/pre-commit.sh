#!/bin/bash
# Bloqueia commit se encontrar chaves privadas ou .env com valores reais

if git diff --cached --name-only | grep -q "\.env$"; then
  echo "ERRO: Tentativa de commitar .env. Use .env.example"
  exit 1
fi

if git diff --cached | grep -qE "PRIVATE_KEY=0x[a-fA-F0-9]{64}"; then
  echo "ERRO: Chave privada detectada no diff"
  exit 1
fi

echo "Hook OK"
exit 0
