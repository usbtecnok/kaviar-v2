# PR #2: Admin Login Rate Limiting

## 🎯 Objetivo

Implementar rate limiting no endpoint de login admin para prevenir ataques de força bruta.

## 🔧 Implementação

### 1. Middleware de Rate Limiting
- Limite: 10 tentativas por minuto por IP (configurável via ENV)
- Retorno: HTTP 429 com mensagem clara
- Headers: Informações de rate limit incluídas
- Logging: Tentativas bloqueadas são registradas

### 2. Configuração Flexível
- `ADMIN_LOGIN_RATE_LIMIT`: Configurável via variável de ambiente
- Skip automático em ambiente de teste
- Padrão: 10 tentativas/minuto

### 3. Tratamento de Erro
- Status: 429 Too Many Requests
- Mensagem: Clara em português
- Código: `RATE_LIMIT_EXCEEDED`
- Retry-After: 60 segundos

## 📋 Arquivos Modificados

- `package.json` - Adicionada dependência `express-rate-limit`
- `src/middlewares/rate-limit.ts` - Novo middleware
- `src/config/index.ts` - Configuração de rate limit
- `src/routes/auth.ts` - Aplicação do middleware
- `.env.example` - Variável de configuração
- `tests/auth-rate-limit.test.ts` - Testes automatizados
- `test-rate-limiting.sh` - Script de teste manual

## 🧪 Como Testar

### Teste Automatizado
```bash
npm test -- auth-rate-limit.test.ts
```

### Teste Manual
```bash
./test-rate-limiting.sh
```

### Teste Manual com curl

#### 1. Requests Normais (dentro do limite)
```bash
# 5 requests - devem retornar 401 (credenciais inválidas)
for i in {1..5}; do
  curl -w "\nStatus: %{http_code}\n" -X POST http://localhost:3001/api/admin/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@kaviar.com","password":"wrong"}'
done
```

#### 2. Exceder Rate Limit
```bash
# 15 requests rápidas - algumas devem retornar 429
for i in {1..15}; do
  echo "Request $i:"
  curl -w "Status: %{http_code}\n" -X POST http://localhost:3001/api/admin/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@kaviar.com","password":"wrong"}'
  sleep 0.1
done
```

#### 3. Verificar Headers de Rate Limit
```bash
curl -I -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"wrong"}'
```

## 📊 Responses Esperadas

### Request Normal (401 Unauthorized)
```json
{
  "success": false,
  "error": "Credenciais inválidas"
}
```

### Rate Limited (429 Too Many Requests)
```json
{
  "success": false,
  "error": "Muitas tentativas de login. Tente novamente em 1 minuto.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

### Headers de Rate Limit
```
RateLimit-Limit: 10
RateLimit-Remaining: 7
RateLimit-Reset: 1641234567
```

## 🔍 Logs do Servidor

Quando rate limit é atingido:
```
🚫 Rate limit exceeded for admin login - IP: 127.0.0.1 - Time: 2026-01-03T20:27:00.000Z
```

## ⚙️ Configuração

### Variáveis de Ambiente
```bash
# .env
ADMIN_LOGIN_RATE_LIMIT=10  # Tentativas por minuto (padrão: 10)
```

### Personalização
```typescript
// Para alterar o limite programaticamente
export const config = {
  rateLimit: {
    adminLogin: parseInt(process.env.ADMIN_LOGIN_RATE_LIMIT || '10'),
  }
}
```

## ✅ Critérios de Aceite

- ✅ **Limite configurável**: Via `ADMIN_LOGIN_RATE_LIMIT` (padrão: 10/min)
- ✅ **429 Status**: Retornado quando limite excedido
- ✅ **Logging básico**: IP e timestamp das tentativas bloqueadas
- ✅ **Headers informativos**: Rate limit info nos headers
- ✅ **Skip em testes**: Não interfere nos testes automatizados
- ✅ **Mensagem clara**: Erro em português com retry info

## 🛡️ Segurança

### Proteção Implementada
- **Força bruta**: Limitada a 10 tentativas/minuto por IP
- **DDoS básico**: Proteção contra spam de requests
- **Transparência**: Atacante sabe que há proteção (desencorajamento)

### Limitações
- **IP-based**: Pode ser contornado com múltiplos IPs
- **Shared IPs**: Pode afetar usuários legítimos em NAT/proxy
- **Memory-based**: Rate limit resetado ao reiniciar servidor

### Melhorias Futuras (fora do escopo)
- Rate limiting baseado em usuário (não apenas IP)
- Persistência em Redis para clusters
- Rate limiting progressivo (aumenta tempo de bloqueio)

## 🚀 Status

**PR #2 implementado com sucesso:**
- Rate limiting funcional no login admin
- Configuração flexível via ENV
- Logging e monitoramento básico
- Testes automatizados e manuais

**Status: ✅ PRONTO PARA PRODUÇÃO**
