# Fila Técnica — Status

Atualizado em 2026-04-16.

## Itens resolvidos

| # | Item | Status | Nota |
|---|------|--------|------|
| 1 | Timeout para `pending_adjustment` | ✅ Já existia | 60s timeout em `dispatcher.service.ts:416-445`. Libera motorista e redispatcha. |
| 2 | Health check do ALB com verificação de DB | ✅ Aplicado | `/api/health` agora faz `SELECT 1`, retorna 503 se DB inacessível. |
| 3 | DDL fora do startup | ✅ Aplicado | DDL movido para `prisma/migrations/20260416_move_startup_ddl.sql`. `server.ts` limpo. Migration é no-op em produção (tabelas já existem), necessária para ambientes novos. |
| 4 | Testes no CI antes do deploy | ✅ Aplicado | Step de `npm ci` + `prisma generate` + `tsc --noEmit -p tsconfig.build.json` antes do Docker build. |

## Próxima fila (escala/robustez — sem urgência)

| # | Item | Contexto |
|---|------|----------|
| 1 | Schema validation (Zod) nos endpoints críticos | Dados malformados causam 500 genéricos |
| 2 | Migrar polling para SSE no mobile | Carga desnecessária, não escala |
| 3 | Rate limit com Redis | In-memory não compartilha entre tasks ECS |
| 4 | Observabilidade (CloudWatch dashboards/alertas) | Problemas invisíveis até alguém reclamar |
| 5 | Dockerfile com user non-root | Segurança de container |
