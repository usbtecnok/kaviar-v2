# KAVIAR DR Bootstrap (Cutoff 2026-07-12)

Uso exclusivo para banco vazio em Disaster Recovery e novos ambientes locais.

Nao executar em producao existente.
Nao executar sobre banco com dados.
Nao adicionar esta baseline dentro de backend/prisma/migrations.

## Cutoff

- Commit SHA: 98bb8ceb51b40125dae6bf5f987c4edd07c62ff3
- Ultima migration no cutoff: 20260712230000_phase5e_municipal_renewal_cycles
- Total de migrations incorporadas: ver migration-cutoff.txt

## Fluxo esperado

1. Aplicar pre-bootstrap.sql (extensoes obrigatorias)
2. Aplicar baseline.sql (DDL derivado do schema Prisma atual)
3. Aplicar post-prisma-objects.sql (objetos essenciais fora do datamodel)
4. Registrar todas as migrations do cutoff como applied com prisma migrate resolve
5. Executar prisma migrate deploy
6. Executar prisma migrate status
7. Executar prisma migrate diff contra prisma/schema.prisma
8. Validar objetos obrigatorios do post-prisma-objects.sql

## Pre-requisitos

- PostgreSQL 15 com PostGIS
- DATABASE_URL explicitamente informado no ambiente
- Banco vazio
- Host local (127.0.0.1 ou localhost)

## Arquivos

- pre-bootstrap.sql
- baseline.sql
- post-prisma-objects.sql
- migration-cutoff.txt
