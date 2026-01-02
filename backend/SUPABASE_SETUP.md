# CONFIGURAÇÃO SUPABASE - KAVIAR BACKEND

## ⚠️ INSTRUÇÕES OBRIGATÓRIAS

### 1. OBTER CREDENCIAIS DO SUPABASE

**No Dashboard do Supabase:**

1. **DATABASE_PASSWORD:**
   - Vá em: `Settings` > `Database`
   - Procure por: `Database password`
   - **IMPORTANTE:** Use a senha do banco, NÃO a service_role key

2. **PROJECT_ID:**
   - Vá em: `Settings` > `General`
   - Procure por: `Reference ID`
   - OU pegue da URL: `https://supabase.com/dashboard/project/[PROJECT_ID]`

### 2. CONFIGURAR DATABASE_URL

**Formato EXATO:**
```
DATABASE_URL="postgresql://postgres:<DATABASE_PASSWORD>@db.<PROJECT_ID>.supabase.co:5432/postgres"
```

**Exemplo:**
```
DATABASE_URL="postgresql://postgres:minha_senha_123@db.abcdefghijklmnop.supabase.co:5432/postgres"
```

### 3. O QUE NÃO USAR

❌ **NÃO use SUPABASE_URL** (é para frontend)
❌ **NÃO use service_role key** (é para autenticação)
❌ **NÃO use pooler connection** (use direct connection)
❌ **NÃO use SUPABASE_ANON_KEY**

### 4. EXECUTAR CONFIGURAÇÃO

```bash
# 1. Copiar e configurar .env
cp .env.example .env
# Editar .env com suas credenciais reais

# 2. Gerar cliente Prisma
npm run db:generate

# 3. Executar migração inicial
npx prisma migrate dev --name init

# 4. Popular banco com dados iniciais
npm run db:seed

# 5. Verificar no Prisma Studio
npx prisma studio
```

### 5. VALIDAÇÃO

**Verificar se funcionou:**
- Tabelas aparecem no Supabase Dashboard > Table Editor
- Prisma Studio abre sem erro
- Dados de seed aparecem nas tabelas

### 6. TROUBLESHOOTING

**Erro de conexão:**
- Verificar se DATABASE_PASSWORD está correto
- Verificar se PROJECT_ID está correto
- Verificar se não há espaços na string de conexão

**Erro de SSL:**
- Adicionar `?sslmode=require` no final da URL se necessário
