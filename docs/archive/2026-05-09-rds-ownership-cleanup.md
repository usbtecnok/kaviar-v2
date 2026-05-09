# Limpeza RDS/Ownership — 2026-05-09

**Status:** ✅ CONCLUÍDA  
**Data:** 2026-05-09  
**Impacto em produção:** Nenhum

---

## Ações Executadas

### 1. Remoção da startup migration redundante
- **Arquivo:** `backend/src/server.ts`
- **Commit:** `a454bcfa2fad829c6251d67b5e709adc544e1ad8`
- **Motivo:** O bloco tentava `ALTER TABLE admins ADD COLUMN invite_code` a cada startup, mas `kaviar_app` não é owner da tabela. Gerava warning `must be owner of table admins` em cada deploy.
- **Resultado:** Warning eliminado dos logs.

### 2. DROP DATABASE kaviar_validation
- **Motivo:** Database órfão, não referenciado por nenhum script, config, CI ou processo.
- **Owner anterior:** `kaviaradmin`

### 3. DROP ROLE usbtecnok
- **Motivo:** Role NOLOGIN sem ownership, grants ou memberships no database de produção.
- **Verificação prévia:** Zero tabelas, zero privilégios, zero memberships no database `kaviar`.

### 4. Rotação de senha do kaviaradmin
- **Motivo:** Senha temporária exposta durante processo de limpeza.
- **Resultado:** Senha rotacionada duas vezes; versão final armazenada em SSM SecureString.
- **SSM Parameter:** `/kaviar/prod/admin_db_password` (versão 2)
- **Nota:** Não afeta produção (app usa `kaviar_app`).

---

## Estado Final do RDS

| Item | Valor |
|------|-------|
| Databases | `kaviar`, `postgres` |
| Roles ativos | `kaviar_app` (LOGIN), `kaviaradmin` (LOGIN) |
| Role de produção (app) | `kaviar_app` |
| Role de manutenção (admin) | `kaviaradmin` |
| Senha kaviaradmin | `/kaviar/prod/admin_db_password` (SSM SecureString) |
| DATABASE_URL produção | `/kaviar/prod/database_url` (usa `kaviar_app`) |

---

## Validações Finais

- ✅ API/health: 200 OK
- ✅ ECS: 1/1 running, deployment COMPLETED
- ✅ Logs: sem warnings, sem erros
- ✅ Task definition: kaviar-backend:343
- ✅ Commit em produção: a454bcf
- ✅ Git: limpo, sem alterações pendentes
- ✅ SSM/app/frontend/APK: inalterados

---

## Rollback (se necessário)

```sql
CREATE DATABASE kaviar_validation OWNER kaviaradmin;
CREATE ROLE usbtecnok NOLOGIN INHERIT;
```

Para restaurar a startup migration: revert do commit `a454bcf`.
