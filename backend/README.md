# KAVIAR Backend

Backend do sistema KAVIAR - Corridas Comunitárias Premium

## Setup Inicial

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar banco de dados

#### Opção 1: Neon PostgreSQL (Recomendado)

1. **Criar conta no Neon**: https://neon.tech
2. **Criar projeto** e obter connection strings:
   - **Direct**: Para migrations/DDL (ex: `ep-xxxx.us-east-1.aws.neon.tech`)
   - **Pooler**: Para runtime/conexões (ex: `ep-xxxx-pooler.c-2.us-east-1.aws.neon.tech`)

3. **Configurar .env**:
   ```bash
   # Direct connection (migrations)
   DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
   
   # Optional: Pooler (runtime)
   DATABASE_URL_POOLER="postgresql://USER:PASSWORD@ep-xxxx-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

#### Opção 2: Supabase PostgreSQL (Alternativa)

Siga as instruções detalhadas em: `SUPABASE_SETUP.md`

**Resumo rápido:**
1. Obter DATABASE_PASSWORD e PROJECT_ID do Supabase
2. Configurar DATABASE_URL no formato:
   ```
   postgresql://postgres:<PASSWORD>@db.<PROJECT_ID>.supabase.co:5432/postgres
   ```

**📋 Importante: Conexões Direct vs Pooler**
- **Migrations/DDL**: Use sempre conexão **direct** (sem pooler)
- **Runtime/App**: Pode usar **pooler** para melhor performance
- **Desenvolvimento**: Direct é suficiente para ambos

### 3. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Editar .env com suas configurações
```

### 4. Executar migrações

**IMPORTANTE: NÃO usar prisma migrate**

1. **No Supabase Dashboard:**
   - Vá em: `SQL Editor`
   - Execute o arquivo: `supabase-schema.sql`

2. **Sincronizar localmente:**
   ```bash
   npx prisma db pull
   npm run db:generate
   ```

### 5. Popular banco com dados iniciais
```bash
# Dados já incluídos no supabase-schema.sql
# Ou execute separadamente:
npm run db:seed
```

### 6. Iniciar servidor
```bash
npm run dev
```

## Endpoints Disponíveis

### Autenticação Admin
- `POST /api/admin/auth/login` - Login de admin
- `POST /api/admin/auth/logout` - Logout

### Gestão de Motoristas (Requer Auth + Role)
- `GET /api/admin/drivers` - Lista motoristas
  - Query params: `page`, `limit`, `status`
- `PUT /api/admin/drivers/:id/approve` - Aprovar motorista
- `PUT /api/admin/drivers/:id/suspend` - Suspender motorista
- `PUT /api/admin/drivers/:id/reactivate` - Reativar motorista

### Dashboard Admin (Requer Auth + Role)
- `GET /api/admin/dashboard/metrics` - Métricas gerais
- `GET /api/admin/dashboard/recent-rides` - Corridas recentes
- `GET /api/admin/dashboard/drivers-overview` - Overview de motoristas

### Gestão de Passageiros (Requer Auth + Role)
- `GET /api/admin/passengers` - Lista passageiros
  - Query params: `page`, `limit`

### Gestão de Corridas (Requer Auth + Role)
- `GET /api/admin/rides` - Lista corridas
  - Query params: `page`, `limit`, `status`
- `GET /api/admin/rides/:id` - Detalhes de uma corrida

### Health Check
- `GET /api/health` - Status do servidor

## Exemplo de Uso

### 1. Login
```bash
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"admin123"}'
```

### 2. Listar Motoristas (com token)
```bash
curl -X GET http://localhost:3001/api/admin/drivers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Listar Corridas por Status
```bash
curl -X GET "http://localhost:3001/api/admin/rides?status=completed&page=1&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Credenciais Padrão

- **Email:** admin@kaviar.com
- **Senha:** admin123

## Estrutura do Projeto

```
src/
├── config/          # Configurações
├── controllers/     # Controllers (futuros)
├── middlewares/     # Middlewares
├── modules/         # Módulos organizados
│   ├── auth/        # Autenticação
│   └── admin/       # Admin (futuro)
├── routes/          # Rotas
├── services/        # Services (futuros)
└── utils/           # Utilitários (futuros)
```

## Scripts Disponíveis

- `npm run dev` - Desenvolvimento com hot reload
- `npm run build` - Build para produção
- `npm run start` - Iniciar produção
- `npm run db:generate` - Gerar cliente Prisma
- `npm run db:migrate` - Executar migrações
- `npm run db:seed` - Popular banco
- `npm run db:studio` - Interface visual do banco
