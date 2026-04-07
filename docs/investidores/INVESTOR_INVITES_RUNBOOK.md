# Sistema de Convites Investidor/Anjo

## Contexto

Sistema para convidar investidores e anjos com acesso read-only ao painel administrativo, usando emails reais para recuperação de senha.

## Como Usar

### 1. Acesso à Tela (SUPER_ADMIN apenas)

1. Faça login em: `https://app.kaviar.com.br/admin/login`
2. No dashboard, clique em **"Convites Investidor/Anjo"**
3. Ou acesse diretamente: `https://app.kaviar.com.br/admin/investor-invites`

### 2. Enviar Convite

1. Digite o **email real** do investidor/anjo
2. Selecione o **tipo de acesso**:
   - **Investidor (Read-Only)**: role `INVESTOR_VIEW`
   - **Angel Viewer (Read-Only)**: role `ANGEL_VIEWER`
3. Clique em **"Enviar Convite"**

### 3. O que acontece

- Sistema cria/atualiza conta com email real
- Gera token de convite (expira em 15 minutos)
- Envia email com link para definir senha
- Força `must_change_password=true`
- Convidado recebe link: `https://app.kaviar.com.br/admin/reset-password?token=...`

### 4. Fluxo do Convidado

1. Recebe email com link
2. Clica no link (válido por 15 minutos)
3. Define senha pessoal
4. Faz login em: `https://app.kaviar.com.br/admin/login`
5. Acesso read-only garantido pelo backend

## Segurança

### Controles Implementados

✅ **Autenticação**: Requer `Bearer token` de admin logado  
✅ **Autorização**: Somente `SUPER_ADMIN` pode convidar  
✅ **Rate Limiting**: 10 convites por minuto por IP  
✅ **Validações**:
- Formato de email válido
- Bloqueia placeholders (`<EMAIL_REAL_X>`)
- Impede alterar role de email existente
- Idempotente: reenvia convite se já existir com mesma role

✅ **Read-Only**: Middleware `investorView` bloqueia POST/PUT/PATCH/DELETE  
✅ **Token Expiration**: Link expira em 15 minutos  
✅ **Resposta Neutra**: Não revela se email existe (segurança)

## Testes de Validação

### Teste 1: Convidar Investidor (SUPER_ADMIN)

```bash
# Obter token de SUPER_ADMIN
TOKEN=$(curl -sS -X POST "https://api.kaviar.com.br/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaviar.com","password":"sua_senha"}' \
  | jq -r '.token')

# Enviar convite
curl -i -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"investidor.real@exemplo.com","role":"INVESTOR_VIEW"}'
```

**Esperado:** HTTP 200 + `{"success":true,"message":"Convite enviado..."}`

### Teste 2: Bloquear Não-SUPER_ADMIN

```bash
# Tentar com token de INVESTOR_VIEW
curl -i -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $TOKEN_INVESTOR" \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","role":"INVESTOR_VIEW"}'
```

**Esperado:** HTTP 403 + `{"success":false,"error":"Acesso negado. Somente SUPER_ADMIN."}`

### Teste 3: Rate Limiting

```bash
# Enviar 11 convites seguidos
for i in {1..11}; do
  curl -sS -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"teste$i@exemplo.com\",\"role\":\"INVESTOR_VIEW\"}" \
    | jq -r '.error // .message'
done
```

**Esperado:** 10x sucesso, 11ª requisição retorna erro de rate limit

### Teste 4: Validação de Email

```bash
# Email inválido
curl -i -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"email_invalido","role":"INVESTOR_VIEW"}'
```

**Esperado:** HTTP 400 + `{"success":false,"error":"Email inválido"}`

### Teste 5: Placeholder Bloqueado

```bash
curl -i -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"<EMAIL_REAL_1>","role":"INVESTOR_VIEW"}'
```

**Esperado:** HTTP 400 + `{"success":false,"error":"Email inválido"}`

### Teste 6: Conflito de Role

```bash
# Primeiro convite como INVESTOR_VIEW
curl -sS -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","role":"INVESTOR_VIEW"}'

# Tentar convidar mesmo email como ANGEL_VIEWER
curl -i -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","role":"ANGEL_VIEWER"}'
```

**Esperado:** HTTP 409 + erro de conflito de role

## Endpoints

### POST /api/admin/investors/invite

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "email": "email.real@dominio.com",
  "role": "INVESTOR_VIEW"
}
```

**Roles permitidos:**
- `INVESTOR_VIEW` - Investidor read-only
- `ANGEL_VIEWER` - Angel viewer read-only

**Resposta Sucesso (200):**
```json
{
  "success": true,
  "message": "Convite enviado (se o email existir, receberá instruções)."
}
```

**Erros:**
- `400` - Email inválido, role inválido, placeholder
- `403` - Não é SUPER_ADMIN
- `409` - Email já existe com role diferente
- `429` - Rate limit excedido (10/min)
- `500` - Erro interno

## Arquitetura

### Backend
- **Rota**: `backend/src/routes/investor-invites.ts`
- **Montagem**: `backend/src/app.ts` (antes do middleware `investorView`)
- **Middlewares**: `authenticateAdmin` → `requireSuperAdmin` → `inviteRateLimit`

### Frontend
- **Tela**: `frontend-app/src/pages/admin/InvestorInvites.jsx`
- **Rota**: `/admin/investor-invites` (protegida com `requireSuperAdmin`)
- **Componente**: `AdminApp.jsx` (card visível apenas para SUPER_ADMIN)

### Segurança
- **Read-Only**: `backend/src/middleware/investorView.ts`
- **Proteção Frontend**: `ProtectedAdminRoute.jsx` com prop `requireSuperAdmin`

## Diferenças vs Migração em Lote

| Aspecto | Migração CSV | Sistema de Convites |
|---------|--------------|---------------------|
| Execução | Manual (SQL) | Automática (UI) |
| Quantidade | 20 de uma vez | 1 por vez |
| Validação | Script Node.js | Backend em tempo real |
| Acesso | DBA/DevOps | SUPER_ADMIN via UI |
| Auditoria | Logs SQL | Logs aplicação |
| Rollback | UPDATE manual | Desativar conta |

## Troubleshooting

### Convite não chega

1. Verificar logs do backend: `aws logs tail /ecs/kaviar-backend --since 5m`
2. Procurar por: `Convite para <email>`
3. Verificar se token foi gerado
4. **TODO**: Integrar com SendGrid/SES para envio real de emails

### Erro 403 ao acessar tela

- Verificar role do admin logado: deve ser `SUPER_ADMIN`
- Limpar localStorage e fazer login novamente

### Email já existe com role diferente

- Decisão manual necessária
- Opções:
  1. Desativar conta antiga: `UPDATE admins SET is_active=false WHERE email='...'`
  2. Usar email alternativo do investidor

## Próximos Passos

1. **Integrar serviço de email** (SendGrid/SES) para envio real
2. **Adicionar auditoria** de convites enviados (tabela `invite_logs`)
3. **Dashboard de convites** pendentes/aceitos
4. **Notificação** quando convidado define senha

## Referências

- Fluxo de reset password: `backend/src/routes/password-reset.ts`
- Middleware read-only: `backend/src/middleware/investorView.ts`
- Proteção de rotas: `frontend-app/src/components/admin/ProtectedAdminRoute.jsx`
