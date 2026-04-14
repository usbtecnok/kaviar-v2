# Segurança de Autenticação — Próximas Melhorias (V2)

## Deploy atual: security-reset-20260409

### O que foi implementado
- Token de reset de uso único (via `password_changed_at`)
- Invalidação automática de sessões após troca de senha
- Remoção de auto-login após reset
- `JWT_RESET_SECRET` separado do secret de autenticação
- `purpose: "password_reset"` no token, validado explicitamente
- Resposta neutra no forgot-password
- Rate limit por IP no forgot-password e reset-password

---

## Próximas melhorias

### 1. Rate limit por email/telefone (além do IP)
**Prioridade:** Alta
**Motivo:** Rate limit por IP é insuficiente contra ataques distribuídos. Atacante com múltiplos IPs pode enumerar emails ou floodar reset requests para um email específico.
**Implementação sugerida:**
- In-memory map (como já existe em `rate-limit.ts` para login) ou Redis
- Chave: email normalizado
- Limite: 3 resets/hora por email
- Aplicar no forgot-password e reset-password

### 2. Auditoria estruturada de eventos de reset
**Prioridade:** Alta
**Motivo:** Hoje não há registro auditável de quem pediu reset, quando, de qual IP, se foi usado ou não.
**Implementação sugerida:**
- Usar `createAuditLog` existente em `src/utils/audit.ts`
- Eventos: `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_COMPLETED`, `PASSWORD_RESET_FAILED`
- Dados: userId, userType, IP (mascarado), timestamp, resultado
- Nunca logar token ou senha

### 3. OTP via WhatsApp para motorista/passageiro
**Prioridade:** Média
**Motivo:** Motoristas e passageiros usam WhatsApp como canal principal. OTP via WhatsApp é mais seguro que email para esse público.
**Implementação sugerida:**
- Usar Twilio Verify ou template WhatsApp existente
- Código de 6 dígitos, validade 5 minutos
- Rate limit: 3 tentativas por telefone/hora

### 4. Migrar JWT_RESET_SECRET para SSM Parameter Store
**Prioridade:** Média
**Motivo:** Hoje está como env var plain text na task definition. Deveria estar no SSM como os secrets do Twilio.
**Implementação:**
- `aws ssm put-parameter --name /kaviar/prod/jwt_reset_secret --type SecureString --value "..."`
- Adicionar ao `secrets` da task definition em vez de `environment`

### 5. Revisão de fluxos equivalentes
**Verificar se seguem a mesma política:**
- [ ] `driver-auth.ts` → `set-password` (hoje não exige auth, qualquer um com email pode setar senha)
- [ ] `passenger-auth.ts` → `set-password` (mesmo problema)
- [ ] `investor-invites-v2.ts` → token de convite (usa reset secret ✅, mas validade de 120min é longa)

**Ação recomendada:**
- `set-password` deveria exigir token de reset ou autenticação prévia
- Reduzir validade do token de convite para 60min
