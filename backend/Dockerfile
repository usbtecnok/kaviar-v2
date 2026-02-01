FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
COPY prisma ./prisma/
COPY docs ./docs/
COPY . .

# Limpar cache do Prisma e instalar dependências
RUN npm ci
RUN rm -rf node_modules/.prisma node_modules/@prisma/client

# Gerar Prisma Client para Debian (linux-gnu)
RUN npx prisma generate

RUN npm run build

FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

# Instalar apenas produção
RUN npm ci --only=production

# Limpar e regenerar Prisma Client no ambiente de produção
RUN rm -rf node_modules/.prisma node_modules/@prisma/client
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/data ./data
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/docs ./docs

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/server.js"]
