# DEPLOY FAILED - ADMIN_DEFAULT_PASSWORD Missing

**Data:** 2026-02-03 08:12 BRT  
**Commit:** 51e4387  
**Status:** ❌ ROLLBACK EXECUTADO

## Problema

O deploy do backend (commit 51e4387) falhou com erro:

```
Error: ADMIN_DEFAULT_PASSWORD must be set in production
    at /app/dist/config/index.js:21:23
```

## Causa Raiz

A variável de ambiente `ADMIN_DEFAULT_PASSWORD` **não está configurada** na task definition 15 do ECS.

O código em `backend/src/config/index.ts` requer essa variável em produção:

```typescript
defaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_DEFAULT_PASSWORD must be set in production');
  }
  return 'CHANGE_ME_IN_PRODUCTION';
})(),
```

## Análise

- **Task Definition 15** (nova): Falta `ADMIN_DEFAULT_PASSWORD`
- **Task Definition 12** (anterior): Provavelmente tem a variável configurada
- **Resultado:** 25 failed tasks, serviço não conseguiu estabilizar

## Ação Tomada

✅ Rollback para task definition 12:

```bash
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --task-definition kaviar-backend:12 \
  --region us-east-2
```

## Impacto

- ❌ Fix do Beta Monitor **NÃO foi deployado** no backend
- ✅ Frontend foi deployado com sucesso (não depende dessa variável)
- ✅ Serviço voltando ao normal com task definition 12
- ⚠️  Painel Beta Monitor ainda mostrará phase1_beta até backend ser deployado

## Solução

### Opção 1: Adicionar variável no GitHub Actions Workflow

Editar `.github/workflows/deploy-backend.yml` para incluir `ADMIN_DEFAULT_PASSWORD` na task definition:

```yaml
environment:
  - name: ADMIN_DEFAULT_PASSWORD
    value: ${{ secrets.ADMIN_DEFAULT_PASSWORD }}
```

E adicionar o secret no GitHub:
```bash
gh secret set ADMIN_DEFAULT_PASSWORD --body "senha_segura_aqui"
```

### Opção 2: Tornar variável opcional em produção

Modificar `backend/src/config/index.ts`:

```typescript
defaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  ADMIN_DEFAULT_PASSWORD not set, using fallback');
    return 'CHANGE_ME_IMMEDIATELY';
  }
  return 'CHANGE_ME_IN_PRODUCTION';
})(),
```

### Opção 3: Usar AWS Secrets Manager

Buscar a senha do Secrets Manager ao invés de env var.

## Recomendação

**Opção 1** é a mais segura e rápida:

1. Adicionar secret no GitHub
2. Atualizar workflow para incluir a variável
3. Fazer novo deploy

## Próximos Passos

1. ⏳ Aguardar rollback estabilizar (task definition 12)
2. ⏳ Decidir qual opção implementar
3. ⏳ Fazer novo deploy com fix do Beta Monitor + variável configurada

## Nota Importante

**O fix do Beta Monitor está correto!** O problema é apenas de configuração de infraestrutura (variável de ambiente faltando).

O código do fix (commit 51e4387) está pronto e testado localmente. Só precisa ser deployado com a variável configurada.

---

**Status Atual:** Aguardando rollback completar para serviço voltar ao normal.
