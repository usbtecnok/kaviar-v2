# Auditoria de Segurança KAVIAR — 2026-05-12

## Resumo

Auditoria de segurança realizada em 12/05/2026. Secrets expostos no histórico Git foram rotacionados, falhas de auth/IDOR corrigidas, vazamentos de error.message sanitizados. Produção validada e estável.

## Secrets Rotacionados

| Secret | Ação | Data |
|--------|------|------|
| DATABASE_URL (senha RDS) | Já rotacionada anteriormente (user `kaviar_app`, senha nova) | antes de 2026-05-08 |
| JWT_SECRET | Rotacionado no SSM `/kaviar/prod/jwt_secret` (v2) | 2026-05-12 |
| ADMIN_DEFAULT_PASSWORD | Rotacionado no SSM `/kaviar/prod/admin_default_password` (v2) + hashes atualizados no banco (137 admins, must_change_password=true) | 2026-05-12 |
| Senhas admin antigas (Kaviar2026!, Financeiro2026!, Angel2026!) | Invalidadas — substituídas pelo novo hash | 2026-05-12 |

## Correções de Código

**Commit:** `7e07ab2` — `security: fix auth/ownership IDOR + sanitize error.message leaks`

| Arquivo | Correção |
|---------|----------|
| `driver-territory.ts` | Adicionado `authenticateDriver` (antes não tinha auth) |
| `driver-dashboard.ts` | Trocado `requireAuth` por `authenticateDriver` + ownership check |
| `passenger-locations.ts` | Trocado `requireAuth` por `authenticatePassenger` + ownership check (POST/GET/DELETE) |
| `notifications.ts` | Trocado `requireAuth` por `authenticateDriver` + ownership check |
| `admin-audit.ts` | Adicionado `authenticateAdmin` antes de `allowReadAccess` |
| `admin-dashboard-metrics.ts` | Adicionado `authenticateAdmin` antes de `allowReadAccess` |
| 10 arquivos de rotas | Substituído `error.message` por mensagem genérica |

## Validação de Produção

Versão em produção: `7e07ab2f519a4dc3a8302eb65b61fe13ca0e77d1`

| Teste | Resultado |
|-------|:---:|
| /api/health | ✅ |
| Login admin | ✅ |
| Dashboard metrics | ✅ |
| Audit logs | ✅ |
| IDOR bloqueado (sem token) | ✅ 401 |
| IDOR bloqueado (token de outro user) | ✅ 403 |
| Estimate ride | ✅ |
| Request ride | ✅ |
| Cancel ride | ✅ |

## Pendência Futura

**Histórico Git ainda contém secrets antigos já invalidados.** Não há risco operacional imediato porque as credenciais foram rotacionadas, mas antes de onboarding de novo dev, auditoria, due diligence, investidor ou abertura maior do repositório, executar limpeza com `git filter-repo` ou migrar para repo novo limpo.

**Decisão:** Opção C (manter histórico) escolhida em 2026-05-12. Reavaliar antes de qualquer expansão de acesso ao repositório.
