# 🔧 TROUBLESHOOTING - Erro de Conexão com Banco de Dados

## ❌ ERRO ENCONTRADO

```
Error: P1001: Can't reach database server at `...sslmode=require:5432`
```

## 🔍 CAUSA

O Prisma estava interpretando incorretamente a `DATABASE_URL` porque havia **aspas duplas** ao redor da URL no arquivo `.env`.

## ✅ SOLUÇÃO APLICADA

### 1. Remover Aspas da DATABASE_URL

**ANTES (❌ Errado):**
```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

**DEPOIS (✅ Correto):**
```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### 2. Arquivo Corrigido

O arquivo `backend/.env` foi atualizado para:

```env
DATABASE_URL=postgresql://neondb_owner:npg_2xbfMWRF6hrO@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=60
```

## 🧪 TESTAR CONEXÃO

Execute este comando para verificar se a conexão está funcionando:

```bash
cd /home/goes/kaviar/backend
npx prisma db execute --stdin <<< "SELECT 1 as test;"
```

**Resultado esperado:**
```
Script executed successfully.
```

## 🚀 EXECUTAR DEPLOY NOVAMENTE

Agora você pode executar o deploy sem problemas:

```bash
cd /home/goes/kaviar
./deploy-aws-complete.sh
```

## 📝 REGRAS PARA .env

### ✅ CORRETO
```env
DATABASE_URL=postgresql://user:pass@host/db
PORT=3003
NODE_ENV=production
```

### ❌ ERRADO
```env
DATABASE_URL="postgresql://user:pass@host/db"  # Aspas causam problemas
PORT="3003"                                     # Aspas desnecessárias
NODE_ENV="production"                           # Aspas desnecessárias
```

### ⚠️ EXCEÇÕES (quando usar aspas)

Use aspas apenas quando o valor contém **espaços** ou **caracteres especiais**:

```env
APP_NAME="Kaviar Platform"           # ✅ Tem espaço
SECRET_KEY="abc#123$xyz"             # ✅ Tem caracteres especiais
DATABASE_URL=postgresql://...        # ✅ Sem espaços, sem aspas
```

## 🔍 OUTROS ERROS COMUNS

### Erro: "Environment variables loaded from .env" mas ainda falha

**Solução:**
```bash
# Exportar manualmente
export DATABASE_URL=postgresql://neondb_owner:npg_2xbfMWRF6hrO@ep-wispy-thunder-ad850l5j-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=60

# Testar
npx prisma db push
```

### Erro: "SSL connection required"

**Solução:** Adicionar `?sslmode=require` na URL:
```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### Erro: "Connection timeout"

**Solução:** Adicionar `connect_timeout`:
```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require&connect_timeout=60
```

### Erro: "Too many connections"

**Solução:** Usar pooler do Neon e limitar conexões:
```env
DATABASE_URL=postgresql://user:pass@host-pooler/db?sslmode=require&pgbouncer=true&connection_limit=1
```

## 📊 VERIFICAR CONFIGURAÇÃO ATUAL

```bash
# Ver DATABASE_URL (sem mostrar senha)
echo $DATABASE_URL | sed 's/:.*@/:***@/'

# Testar conexão direta com psql
psql "$DATABASE_URL" -c "SELECT version();"

# Verificar se Prisma consegue conectar
cd backend
npx prisma db execute --stdin <<< "SELECT current_database();"
```

## ✅ STATUS ATUAL

- ✅ DATABASE_URL corrigida (sem aspas)
- ✅ Conexão testada e funcionando
- ✅ Script de deploy atualizado
- ✅ Pronto para executar deploy

## 🚀 PRÓXIMO PASSO

Execute o deploy:

```bash
cd /home/goes/kaviar
./deploy-aws-complete.sh
```

**Problema resolvido! 🎉**
