# Neon PostgreSQL - Configuração Canônica

## Problema Resolvido
❌ `Error { kind: Closed }` no Prisma  
✅ Conexão estável com Neon Pooler

## Diagnóstico
- **Host:** `ep-wispy-thunder-ad850l5j-pooler` (modo Pooler)
- **Problema:** faltava `pgbouncer=true` + tinha params inválidos (`pool_timeout`, `idle_timeout`)

## DATABASE_URL Canônico (Render)

```bash
# Atualizar no Render Dashboard → Environment Variables:
DATABASE_URL="postgresql://neondb_owner:npg_2xbfMWRF6hrO@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=60"
```

## Parâmetros Obrigatórios (Pooler)
- ✅ `sslmode=require` - SSL obrigatório
- ✅ `pgbouncer=true` - modo pooler do Neon
- ✅ `connection_limit=1` - 1 conexão por instância Prisma
- ✅ `connect_timeout=60` - timeout de conexão

## Parâmetros Removidos (Inválidos)
- ❌ `pool_timeout=60` - não reconhecido pelo Neon
- ❌ `idle_timeout=300` - não reconhecido pelo Neon

## Validação Pós-Deploy
1. Acessar `/api/health` - verificar gitCommit
2. Monitorar logs por 5min - sem `Error { kind: Closed }`
3. Testar fluxo completo - cadastro + documentos

## Reversão (se necessário)
```bash
# Voltar para conexão direta (sem pooler):
# 1. Trocar host: remover "-pooler" do endpoint
# 2. Remover pgbouncer=true
# 3. Manter connection_limit=1 e sslmode=require
```

---
**Data:** 2026-01-21  
**Commit:** e171995 + este fix  
**Modo:** Neon Pooler (pgBouncer)
