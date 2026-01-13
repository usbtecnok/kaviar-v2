# KAVIAR Backend

Backend do sistema KAVIAR - Corridas Comunitárias Premium

## Setup Inicial

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar banco de dados

1. **Criar conta no Neon**: https://neon.tech
2. **Criar projeto** e obter connection string pooler
3. **Configurar .env**:
   ```bash
   DATABASE_URL="postgresql://user:password@host-pooler.neon.tech/database?sslmode=require&connection_limit=2&pool_timeout=20&connect_timeout=10"
   ```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Editar .env com suas credenciais
```

### 4. Executar migrações

```bash
npm run db:generate
npm run db:migrate
```

### 5. Iniciar servidor

```bash
# Desenvolvimento
npm run dev:3003

# Produção
npm run build
npm run start:3003
```

## Scripts Disponíveis

- `npm run dev:3003` - Servidor desenvolvimento (porta 3003)
- `npm run build` - Build para produção
- `npm run start:3003` - Servidor produção (porta 3003)
- `npm run kill:ports` - Matar processos nas portas 3001/3003
- `npm run db:generate` - Gerar Prisma Client
- `npm run db:migrate` - Executar migrações
- `npm run db:studio` - Abrir Prisma Studio

## Estrutura do Projeto

```
src/
├── config/          # Configurações (database, env)
├── routes/          # Rotas da API
├── services/        # Lógica de negócio
├── middlewares/     # Middlewares Express
├── modules/         # Módulos organizados por feature
└── utils/           # Utilitários
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/passenger/login` - Login passageiro
- `POST /api/auth/driver/login` - Login motorista
- `POST /api/admin/auth/login` - Login admin

## Variáveis de Ambiente

Ver `.env.example` para lista completa de variáveis necessárias.
