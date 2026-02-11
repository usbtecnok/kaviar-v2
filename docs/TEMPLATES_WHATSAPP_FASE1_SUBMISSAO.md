# TEMPLATES WHATSAPP - FASE 1 (SUBMISSÃO TWILIO)

**Data**: 2026-02-10  
**Status**: Pronto para submissão

---

## INSTRUÇÕES DE SUBMISSÃO

1. Acessar: https://console.twilio.com/us1/develop/sms/content-editor
2. Clicar "Create new Content"
3. Tipo: **WhatsApp**
4. Language: **Portuguese (Brazil) - pt_BR**
5. Colar texto abaixo
6. Twilio detecta variáveis automaticamente: `{{1}}`, `{{2}}`, etc
7. Submit for Approval
8. Aguardar 24-48h
9. Copiar Content SID após aprovação

---

## TEMPLATE 1: kaviar_invites_investor_v1

**Nome**: `kaviar_invites_investor_v1`  
**Categoria**: ACCOUNT_UPDATE  
**Idioma**: pt_BR  
**Tipo**: Business-initiated

### Texto para Twilio Console:
```
🔐 *KAVIAR - Convite para Acesso*

Olá {{1}},

Você foi convidado para acessar o sistema KAVIAR com permissões de *{{2}}* (read-only).

📱 Defina sua senha:
{{3}}

⏱️ Este link expira em *15 minutos*.

Após definir sua senha, faça login em:
{{4}}
```

### Mapeamento de Variáveis:
```
{{1}} = name (ex: "Investidor")
{{2}} = role (ex: "Investidor" ou "Angel Viewer")
{{3}} = link (ex: "https://kaviar.com.br/admin/reset-password?token=...")
{{4}} = login_url (ex: "https://kaviar.com.br/admin/login")
```

### Sample Values (para teste):
```json
{
  "1": "João Silva",
  "2": "Investidor",
  "3": "https://kaviar.com.br/admin/reset-password?token=eyJhbGciOiJIUzI1NiIs...",
  "4": "https://kaviar.com.br/admin/login"
}
```

### Após Aprovação:
```bash
# Copiar Content SID (formato: HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
# Adicionar ao .env:
TWILIO_TEMPLATE_INVITE_INVESTOR=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## TEMPLATE 2: kaviar_rides_driver_assigned_v1

**Nome**: `kaviar_rides_driver_assigned_v1`  
**Categoria**: TRANSACTIONAL  
**Idioma**: pt_BR  
**Tipo**: Business-initiated

### Texto para Twilio Console:
```
🚗 *Nova Corrida Disponível*

📍 Origem: {{1}}
🎯 Destino: {{2}}
💰 Valor: R$ {{3}}
⏱️ ETA: {{4}} min

Aceite no app em até *30 segundos*.
```

### Mapeamento de Variáveis:
```
{{1}} = pickup (ex: "Copacabana")
{{2}} = dropoff (ex: "Ipanema")
{{3}} = price (ex: "25,00")
{{4}} = eta (ex: "5")
```

### Sample Values:
```json
{
  "1": "Copacabana",
  "2": "Ipanema",
  "3": "25,00",
  "4": "5"
}
```

### Após Aprovação:
```bash
TWILIO_TEMPLATE_RIDE_DRIVER_ASSIGNED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## TEMPLATE 3: kaviar_rides_passenger_driver_arriving_v1

**Nome**: `kaviar_rides_passenger_driver_arriving_v1`  
**Categoria**: TRANSACTIONAL  
**Idioma**: pt_BR  
**Tipo**: Business-initiated

### Texto para Twilio Console:
```
🚗 *Motorista a Caminho*

{{1}} está chegando!

🚙 {{2}} - {{3}}
⭐ {{4}}/5
⏱️ Chega em *{{5}} min*

Acompanhe no app.
```

### Mapeamento de Variáveis:
```
{{1}} = driver_name (ex: "Carlos")
{{2}} = car_model (ex: "Honda Civic")
{{3}} = plate (ex: "ABC-1234")
{{4}} = rating (ex: "4.8")
{{5}} = eta (ex: "3")
```

### Sample Values:
```json
{
  "1": "Carlos Silva",
  "2": "Honda Civic Prata",
  "3": "ABC-1234",
  "4": "4.8",
  "5": "3"
}
```

### Após Aprovação:
```bash
TWILIO_TEMPLATE_RIDE_PASSENGER_ARRIVING=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## CHECKLIST DE SUBMISSÃO

### Antes de Submeter
- [ ] Texto em pt_BR (sem inglês)
- [ ] Variáveis no formato `{{1}}`, `{{2}}`, etc
- [ ] Sem dados sensíveis (CPF, senha, etc)
- [ ] Categoria correta (ACCOUNT_UPDATE ou TRANSACTIONAL)
- [ ] Link completo (não encurtado)
- [ ] Emojis apropriados (não excessivos)

### Durante Aprovação (24-48h)
- [ ] Aguardar email de aprovação do Twilio
- [ ] Verificar status no Console
- [ ] Se rejeitado: ler motivo e ajustar

### Após Aprovação
- [ ] Copiar Content SID de cada template
- [ ] Adicionar env vars no GitHub Secrets:
  ```bash
  gh secret set TWILIO_TEMPLATE_INVITE_INVESTOR
  gh secret set TWILIO_TEMPLATE_RIDE_DRIVER_ASSIGNED
  gh secret set TWILIO_TEMPLATE_RIDE_PASSENGER_ARRIVING
  ```
- [ ] Atualizar ECS Task Definition com env vars
- [ ] Deploy backend
- [ ] Testar envio de template

---

## TESTE APÓS APROVAÇÃO

### Teste 1: Convite Investidor
```bash
curl -X POST "https://api.kaviar.com.br/api/admin/investors/invite" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "phone": "+5521980669989",
    "role": "INVESTOR_VIEW"
  }' | jq

# Esperado: {"success":true,"message":"Convite enviado via WhatsApp."}
```

### Teste 2: Verificar Logs
```bash
# CloudWatch Logs
# Procurar por: [WhatsApp] Template sent: kaviar_invites_investor_v1
```

### Teste 3: Fallback para Email
```bash
# Remover env var temporariamente para testar fallback
# Deve enviar email com nota: "Tentamos enviar via WhatsApp..."
```

---

## TROUBLESHOOTING

### Template Rejeitado
**Motivos comuns**:
- Texto muito promocional
- Variáveis sensíveis (senha, CPF)
- Link encurtado (bit.ly, etc)
- Categoria errada

**Solução**: Ajustar texto e resubmeter

### Template Não Envia
**Verificar**:
1. Content SID correto no env var
2. Twilio Account SID/Auth Token corretos
3. WhatsApp FROM number correto
4. Variáveis todas preenchidas
5. Logs do backend: `[WhatsApp] Error sending template`

### Fallback para Email Sempre Ativa
**Causa**: Template não configurado (SID vazio)  
**Solução**: Adicionar env var com Content SID

---

## ENV VARS FINAIS (APÓS APROVAÇÃO)

```bash
# Twilio básico (já configurado)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Templates Fase 1 (adicionar após aprovação)
TWILIO_TEMPLATE_INVITE_INVESTOR=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TEMPLATE_RIDE_DRIVER_ASSIGNED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TEMPLATE_RIDE_PASSENGER_ARRIVING=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## PRÓXIMOS PASSOS

### Imediato
1. ✅ Backend implementado (template-ready)
2. ⏳ Submeter 3 templates no Twilio Console
3. ⏳ Aguardar aprovação (24-48h)

### Após Aprovação
4. ⏳ Copiar Content SIDs
5. ⏳ Adicionar env vars
6. ⏳ Deploy backend
7. ⏳ Testar em PROD

### Fase 2 (Futuro)
- Template: Corrida finalizada (motorista)
- Template: Corrida finalizada (passageiro)
- Template: Convite motorista
- Template: Reset senha
- Template: Alertas operacionais

---

**Status**: ✅ BACKEND PRONTO - Aguardando aprovação de templates
