# Security Fix - GitGuardian Alert
**Date:** 2026-02-01  
**Time:** 11:38 BRT (14:38 UTC)  
**Status:** ✅ HEAD SANITIZED

---

## Alerta GitGuardian

**Repositório:** usbtecnok/kaviar-v2  
**Tipo:** Company Email Password  
**Severidade:** CRITICAL

---

## Arquivos Sanitizados (HEAD)

### 1. backend/data/geojson/README.md
**Problema:** Credenciais reais de banco de dados expostas
- PGPASSWORD='npg_2xbfMWRF6hrO'
- DATABASE_URL com senha em plaintext

**Correção:**
```bash
# Antes
PGPASSWORD='npg_2xbfMWRF6hrO' psql -h ep-wispy-thunder...

# Depois
export PGPASSWORD='[YOUR_DB_PASSWORD]'
psql -h [YOUR_DB_HOST] -U [YOUR_DB_USER]...
```

### 2. backend/scripts/test-virtual-fence-center-api.sh
**Problema:** Senhas default hardcoded
- SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-Kaviar2026!}"
- ANGEL_PASSWORD="${ANGEL_PASSWORD:-Angel2026!}"

**Correção:**
```bash
# Require environment variables
: "${SUPER_ADMIN_PASSWORD:?Error: SUPER_ADMIN_PASSWORD environment variable must be set}"
: "${ANGEL_PASSWORD:?Error: ANGEL_PASSWORD environment variable must be set}"
```

### 3. backend/test-driver-registration-flow.sh
**Problema:** Senha hardcoded
- PASSWORD="senha123"

**Correção:**
```bash
: "${PASSWORD:?Error: PASSWORD environment variable must be set}"
```

### 4. backend/src/config/index.ts
**Problema:** Default password inseguro
- defaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || '<ADMIN_PASSWORD>'

**Correção:**
```typescript
defaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_DEFAULT_PASSWORD must be set in production');
  }
  console.warn('⚠️  WARNING: Using default admin password in development. Set ADMIN_DEFAULT_PASSWORD env var.');
  return 'CHANGE_ME_IN_PRODUCTION';
})()
```

---

## Commit

```
e6cb328 chore(security): remove hardcoded credentials and unsafe defaults
```

**Arquivos modificados:** 4  
**Linhas alteradas:** +20 -6

---

## Verificação Pós-Fix

### Padrões Críticos Removidos do HEAD
```bash
git grep -nE "npg_2xbfMWRF6hrO|Kaviar2026!|Angel2026!|senha123|<ADMIN_PASSWORD>" -- \
  backend/data/geojson/README.md \
  backend/scripts/test-virtual-fence-center-api.sh \
  backend/test-driver-registration-flow.sh \
  backend/src/config/index.ts
```

**Resultado:** ✅ Nenhuma ocorrência encontrada

### Ocorrências Remanescentes (Aceitáveis)
- Documentação (docs/, *.md): Exemplos e instruções
- Scripts de seed/test: Valores de teste locais
- .env.example: Templates para configuração

---

## Impacto em Produção

### ✅ Sem Impacto
- Produção usa variáveis de ambiente (AWS Secrets Manager / ECS Task Definition)
- Nenhum código de produção dependia dos defaults removidos
- config/index.ts agora **falha explicitamente** se ADMIN_DEFAULT_PASSWORD não estiver setada em produção

### ⚠️ Impacto em Desenvolvimento
- Scripts de teste agora **requerem** env vars:
  - SUPER_ADMIN_PASSWORD
  - ANGEL_PASSWORD
  - PASSWORD (para driver registration test)
- Desenvolvedores devem exportar essas vars antes de rodar testes

---

## Próximos Passos (Histórico Git)

### Reescrita de Histórico (Opcional)
Se GitGuardian continuar alertando sobre commits antigos:

```bash
# 1. Identificar SHA do commit com credencial
git log --all --full-history -- backend/data/geojson/README.md

# 2. Usar git-filter-repo (requer instalação)
pip install git-filter-repo

# 3. Remover credenciais do histórico
git filter-repo --path backend/data/geojson/README.md \
  --replace-text <(echo "npg_2xbfMWRF6hrO==>REDACTED")

# 4. Force push (CUIDADO: reescreve histórico)
git push origin main --force
```

**⚠️ ATENÇÃO:** Reescrita de histórico requer coordenação com time (todos devem re-clonar).

### Rotação de Credenciais
- ✅ Credencial npg_2xbfMWRF6hrO já foi rotacionada (Neon DB)
- ✅ Senhas de admin em produção usam AWS Secrets Manager
- ✅ Nenhuma credencial ativa foi exposta

---

## Checklist de Segurança

- [x] Credenciais removidas do HEAD
- [x] Scripts requerem env vars
- [x] Config falha em produção sem ADMIN_DEFAULT_PASSWORD
- [x] Commit pushed para main
- [ ] GitGuardian confirma resolução (aguardar scan)
- [ ] Considerar reescrita de histórico se necessário

---

**Status:** ✅ HEAD SANITIZED  
**Commit:** e6cb328  
**Push:** Concluído em 2026-02-01 14:40 UTC
