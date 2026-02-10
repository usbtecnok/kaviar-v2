# ESTRATÉGIA DE TEMPLATES WHATSAPP - KAVIAR

**Data**: 2026-02-10  
**Objetivo**: Conjunto mínimo de templates Twilio para casos essenciais

---

## PRINCÍPIOS

1. **Mínimo viável**: 6-10 templates (não 30)
2. **Text-only**: Sem mídia, pt_BR
3. **Reutilizáveis**: Variáveis padronizadas
4. **LGPD-safe**: Sem dados sensíveis desnecessários
5. **Naming**: `kaviar_<dominio>_<evento>_v1`

---

## TEMPLATES RECOMENDADOS (8 TOTAL)

### 1. INVITES (2 templates)

#### 1.1. kaviar_invites_investor_v1
**Quando usar**: Convite para Investidor/Angel Viewer  
**Quem recebe**: Investidor/Angel  
**Tipo**: Business-initiated (precisa aprovação)

**Texto**:
```
🔐 *KAVIAR - Convite para Acesso*

Olá {{name}},

Você foi convidado para acessar o sistema KAVIAR com permissões de *{{role}}* (read-only).

📱 Defina sua senha:
{{link}}

⏱️ Este link expira em *15 minutos*.

Após definir sua senha, faça login em:
{{login_url}}
```

**Variáveis**:
```json
{
  "name": "Investidor",
  "role": "Investidor",
  "link": "https://kaviar.com.br/admin/reset-password?token=...",
  "login_url": "https://kaviar.com.br/admin/login"
}
```

---

#### 1.2. kaviar_invites_driver_v1
**Quando usar**: Convite para motorista (onboarding)  
**Quem recebe**: Motorista  
**Tipo**: Business-initiated

**Texto**:
```
🚗 *KAVIAR - Bem-vindo, Motorista!*

Olá {{name}},

Você foi aprovado para dirigir na KAVIAR!

📱 Complete seu cadastro:
{{link}}

⏱️ Link válido por *24 horas*.

Dúvidas? Responda esta mensagem.
```

**Variáveis**:
```json
{
  "name": "Carlos Silva",
  "link": "https://kaviar.com.br/motorista/onboarding?token=..."
}
```

---

### 2. AUTH (1 template)

#### 2.1. kaviar_auth_password_reset_v1
**Quando usar**: Reset de senha via WhatsApp  
**Quem recebe**: Qualquer usuário  
**Tipo**: User-initiated (resposta a solicitação)

**Texto**:
```
🔐 *KAVIAR - Redefinir Senha*

Olá {{name}},

Recebemos uma solicitação para redefinir sua senha.

🔗 Clique aqui:
{{link}}

⏱️ Expira em *15 minutos*.

Não solicitou? Ignore esta mensagem.
```

**Variáveis**:
```json
{
  "name": "João",
  "link": "https://kaviar.com.br/reset-password?token=..."
}
```

---

### 3. RIDES_DRIVER (2 templates)

#### 3.1. kaviar_rides_driver_assigned_v1
**Quando usar**: Motorista recebeu corrida  
**Quem recebe**: Motorista  
**Tipo**: Business-initiated

**Texto**:
```
🚗 *Nova Corrida Disponível*

📍 Origem: {{pickup}}
🎯 Destino: {{dropoff}}
💰 Valor: R$ {{price}}
⏱️ ETA: {{eta}} min

Aceite no app em até *30 segundos*.
```

**Variáveis**:
```json
{
  "pickup": "Copacabana",
  "dropoff": "Ipanema",
  "price": "25,00",
  "eta": "5"
}
```

---

#### 3.2. kaviar_rides_driver_completed_v1
**Quando usar**: Corrida finalizada (confirmação)  
**Quem recebe**: Motorista  
**Tipo**: Business-initiated

**Texto**:
```
✅ *Corrida Finalizada*

Corrida #{{ride_id}} concluída.

💰 Valor: R$ {{price}}
📊 Taxa: R$ {{fee}}
💵 Você recebe: R$ {{net}}

Obrigado por dirigir com a KAVIAR!
```

**Variáveis**:
```json
{
  "ride_id": "ride_123",
  "price": "25,00",
  "fee": "5,00",
  "net": "20,00"
}
```

---

### 4. RIDES_PASSENGER (2 templates)

#### 4.1. kaviar_rides_passenger_driver_arriving_v1
**Quando usar**: Motorista a caminho  
**Quem recebe**: Passageiro  
**Tipo**: Business-initiated

**Texto**:
```
🚗 *Motorista a Caminho*

{{driver_name}} está chegando!

🚙 {{car_model}} - {{plate}}
⭐ {{rating}}/5
⏱️ Chega em *{{eta}} min*

Acompanhe no app.
```

**Variáveis**:
```json
{
  "driver_name": "Carlos",
  "car_model": "Honda Civic",
  "plate": "ABC-1234",
  "rating": "4.8",
  "eta": "3"
}
```

---

#### 4.2. kaviar_rides_passenger_completed_v1
**Quando usar**: Corrida finalizada (solicitar avaliação)  
**Quem recebe**: Passageiro  
**Tipo**: Business-initiated

**Texto**:
```
✅ *Corrida Finalizada*

Obrigado por usar a KAVIAR!

💰 Valor: R$ {{price}}
🚗 Motorista: {{driver_name}}

⭐ Avalie sua experiência:
{{rating_link}}
```

**Variáveis**:
```json
{
  "price": "25,00",
  "driver_name": "Carlos",
  "rating_link": "https://kaviar.com.br/passageiro/rating/ride_123"
}
```

---

### 5. OPS (1 template)

#### 5.1. kaviar_ops_driver_alert_v1
**Quando usar**: Alerta operacional (taxa alta, voltar pra geofence)  
**Quem recebe**: Motorista  
**Tipo**: Business-initiated

**Texto**:
```
⚠️ *Alerta Operacional*

{{alert_type}}

{{message}}

📱 Veja detalhes no app.
```

**Variáveis**:
```json
{
  "alert_type": "Taxa de Cancelamento Alta",
  "message": "Sua taxa de cancelamento está em 25%. Mantenha abaixo de 20% para evitar penalidades."
}
```

**Exemplos de uso**:
- Taxa cancelamento alta
- Voltar para geofence (se fora por muito tempo)
- Documentos vencendo
- Manutenção programada

---

## ESTRATÉGIA DE APROVAÇÃO

### Business-Initiated (Precisam Aprovação)
Todos os 8 templates acima são **business-initiated** e precisam:
1. Submeter para aprovação Twilio/WhatsApp
2. Aguardar 24-48h
3. Usar apenas após aprovação

**Processo**:
```
1. Criar template no Twilio Console
2. Submeter para WhatsApp Business API
3. Aguardar aprovação
4. Copiar Content SID (HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
5. Adicionar ao backend
```

### User-Initiated (Não Precisam Aprovação)
Se o usuário **iniciar** a conversa (ex: enviar "Oi" primeiro), podemos enviar mensagens livres por 24h.

**Casos de uso**:
- Suporte ao cliente (resposta a dúvida)
- Confirmação de ação (usuário pediu algo)

**Não recomendado para KAVIAR**: Manter tudo como business-initiated para consistência.

---

## IMPLEMENTAÇÃO BACKEND

### 1. Mapa de Templates

**Arquivo**: `backend/src/services/whatsapp-templates.ts`

```typescript
export enum WhatsAppTemplate {
  INVITE_INVESTOR = 'kaviar_invites_investor_v1',
  INVITE_DRIVER = 'kaviar_invites_driver_v1',
  AUTH_PASSWORD_RESET = 'kaviar_auth_password_reset_v1',
  RIDE_DRIVER_ASSIGNED = 'kaviar_rides_driver_assigned_v1',
  RIDE_DRIVER_COMPLETED = 'kaviar_rides_driver_completed_v1',
  RIDE_PASSENGER_ARRIVING = 'kaviar_rides_passenger_driver_arriving_v1',
  RIDE_PASSENGER_COMPLETED = 'kaviar_rides_passenger_completed_v1',
  OPS_DRIVER_ALERT = 'kaviar_ops_driver_alert_v1'
}

interface TemplateConfig {
  sid: string;
  name: WhatsAppTemplate;
  variables: string[];
}

// Mapa de templates (SIDs vêm do Twilio após aprovação)
export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplate, TemplateConfig> = {
  [WhatsAppTemplate.INVITE_INVESTOR]: {
    sid: process.env.TWILIO_TEMPLATE_INVITE_INVESTOR || '',
    name: WhatsAppTemplate.INVITE_INVESTOR,
    variables: ['name', 'role', 'link', 'login_url']
  },
  [WhatsAppTemplate.INVITE_DRIVER]: {
    sid: process.env.TWILIO_TEMPLATE_INVITE_DRIVER || '',
    name: WhatsAppTemplate.INVITE_DRIVER,
    variables: ['name', 'link']
  },
  [WhatsAppTemplate.AUTH_PASSWORD_RESET]: {
    sid: process.env.TWILIO_TEMPLATE_PASSWORD_RESET || '',
    name: WhatsAppTemplate.AUTH_PASSWORD_RESET,
    variables: ['name', 'link']
  },
  [WhatsAppTemplate.RIDE_DRIVER_ASSIGNED]: {
    sid: process.env.TWILIO_TEMPLATE_RIDE_DRIVER_ASSIGNED || '',
    name: WhatsAppTemplate.RIDE_DRIVER_ASSIGNED,
    variables: ['pickup', 'dropoff', 'price', 'eta']
  },
  [WhatsAppTemplate.RIDE_DRIVER_COMPLETED]: {
    sid: process.env.TWILIO_TEMPLATE_RIDE_DRIVER_COMPLETED || '',
    name: WhatsAppTemplate.RIDE_DRIVER_COMPLETED,
    variables: ['ride_id', 'price', 'fee', 'net']
  },
  [WhatsAppTemplate.RIDE_PASSENGER_ARRIVING]: {
    sid: process.env.TWILIO_TEMPLATE_RIDE_PASSENGER_ARRIVING || '',
    name: WhatsAppTemplate.RIDE_PASSENGER_ARRIVING,
    variables: ['driver_name', 'car_model', 'plate', 'rating', 'eta']
  },
  [WhatsAppTemplate.RIDE_PASSENGER_COMPLETED]: {
    sid: process.env.TWILIO_TEMPLATE_RIDE_PASSENGER_COMPLETED || '',
    name: WhatsAppTemplate.RIDE_PASSENGER_COMPLETED,
    variables: ['price', 'driver_name', 'rating_link']
  },
  [WhatsAppTemplate.OPS_DRIVER_ALERT]: {
    sid: process.env.TWILIO_TEMPLATE_OPS_DRIVER_ALERT || '',
    name: WhatsAppTemplate.OPS_DRIVER_ALERT,
    variables: ['alert_type', 'message']
  }
};
```

---

### 2. Serviço Atualizado

**Arquivo**: `backend/src/services/whatsapp.ts`

```typescript
import { WHATSAPP_TEMPLATES, WhatsAppTemplate } from './whatsapp-templates';

class WhatsAppService {
  /**
   * Send templated WhatsApp message
   */
  async sendTemplate(
    to: string,
    template: WhatsAppTemplate,
    variables: Record<string, string>
  ): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('WhatsApp service not configured');
    }

    const config = WHATSAPP_TEMPLATES[template];
    
    if (!config.sid) {
      console.error(`[WhatsApp] Template ${template} not configured (missing SID)`);
      throw new Error(`Template ${template} not available`);
    }

    // Validar variáveis obrigatórias
    const missing = config.variables.filter(v => !variables[v]);
    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.join(', ')}`);
    }

    const normalizedTo = this.normalizeWhatsAppNumber(to);
    const normalizedFrom = this.normalizeWhatsAppNumber(this.config!.fromNumber);

    try {
      const message = await this.client!.messages.create({
        contentSid: config.sid,
        contentVariables: JSON.stringify(variables),
        from: normalizedFrom,
        to: normalizedTo
      });

      console.log(`[WhatsApp] Template sent: ${template}`, { 
        sid: message.sid, 
        status: message.status 
      });
    } catch (error: any) {
      console.error(`[WhatsApp] Error sending template ${template}:`, error);
      throw new Error(`Failed to send template: ${error.message}`);
    }
  }

  /**
   * Send freeform message (fallback for non-templated)
   * Only works if user initiated conversation in last 24h
   */
  async sendFreeform(to: string, body: string): Promise<void> {
    // Implementação atual (já existe)
  }
}
```

---

### 3. Uso no Código

**Exemplo 1: Convite Investidor**
```typescript
// backend/src/routes/investor-invites.ts

import { whatsappService } from '../services/whatsapp';
import { WhatsAppTemplate } from '../services/whatsapp-templates';

// Enviar convite
await whatsappService.sendTemplate(
  phone,
  WhatsAppTemplate.INVITE_INVESTOR,
  {
    name: admin.name,
    role: role === 'INVESTOR_VIEW' ? 'Investidor' : 'Angel Viewer',
    link: resetUrl,
    login_url: `${config.frontendUrl}/admin/login`
  }
);
```

**Exemplo 2: Motorista Recebeu Corrida**
```typescript
// backend/src/services/dispatch.ts

await whatsappService.sendTemplate(
  driver.phone,
  WhatsAppTemplate.RIDE_DRIVER_ASSIGNED,
  {
    pickup: ride.pickup_neighborhood,
    dropoff: ride.dropoff_neighborhood,
    price: ride.price.toFixed(2).replace('.', ','),
    eta: calculateETA(driver.location, ride.pickup).toString()
  }
);
```

**Exemplo 3: Alerta Operacional**
```typescript
// backend/src/services/driver-monitoring.ts

await whatsappService.sendTemplate(
  driver.phone,
  WhatsAppTemplate.OPS_DRIVER_ALERT,
  {
    alert_type: 'Taxa de Cancelamento Alta',
    message: `Sua taxa está em ${cancelRate}%. Mantenha abaixo de 20%.`
  }
);
```

---

### 4. Fallback Seguro

```typescript
// Se template não estiver configurado, usar freeform (se disponível)
try {
  await whatsappService.sendTemplate(phone, template, variables);
} catch (error) {
  console.error(`[WhatsApp] Template failed, trying freeform:`, error);
  
  // Fallback: enviar como texto simples (só funciona se user-initiated)
  try {
    await whatsappService.sendFreeform(phone, fallbackText);
  } catch (fallbackError) {
    console.error(`[WhatsApp] Freeform also failed:`, fallbackError);
    // Último fallback: email ou notificação in-app
    await emailService.sendMail({ to: user.email, ... });
  }
}
```

---

## ENV VARS NECESSÁRIAS

```bash
# Twilio básico
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Template SIDs (após aprovação)
TWILIO_TEMPLATE_INVITE_INVESTOR=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TEMPLATE_INVITE_DRIVER=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TEMPLATE_PASSWORD_RESET=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TEMPLATE_RIDE_DRIVER_ASSIGNED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TEMPLATE_RIDE_DRIVER_COMPLETED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TEMPLATE_RIDE_PASSENGER_ARRIVING=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TEMPLATE_RIDE_PASSENGER_COMPLETED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TEMPLATE_OPS_DRIVER_ALERT=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## PROCESSO DE APROVAÇÃO

### 1. Criar Templates no Twilio Console
```
1. Acessar: https://console.twilio.com/us1/develop/sms/content-editor
2. Clicar "Create new Content"
3. Tipo: WhatsApp
4. Language: Portuguese (Brazil) - pt_BR
5. Colar texto do template
6. Adicionar variáveis: {{1}}, {{2}}, etc (Twilio converte automaticamente)
7. Submit for Approval
```

### 2. Aguardar Aprovação
- Tempo: 24-48h
- WhatsApp revisa conteúdo
- Pode rejeitar se:
  - Texto muito promocional
  - Variáveis sensíveis (senha, CPF)
  - Linguagem inadequada

### 3. Copiar Content SID
```
Após aprovação:
1. Abrir template aprovado
2. Copiar Content SID: HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
3. Adicionar ao .env
```

### 4. Testar
```bash
# Testar template
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$ACCOUNT_SID/Messages.json" \
  --data-urlencode "ContentSid=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --data-urlencode "ContentVariables={\"name\":\"Teste\",\"role\":\"Investidor\",...}" \
  --data-urlencode "From=whatsapp:+14155238886" \
  --data-urlencode "To=whatsapp:+5521980669989" \
  -u $ACCOUNT_SID:$AUTH_TOKEN
```

---

## CUSTOS ESTIMADOS

### WhatsApp Business API (Twilio)
```
Brasil (conversation-based pricing):
- Business-initiated: $0.0088 por conversa
- User-initiated: $0.0033 por conversa
- Conversa = janela de 24h

Estimativa KAVIAR (100 usuários ativos/dia):
- 50 convites/mês: $0.44
- 200 notificações corrida/mês: $1.76
- 50 alertas ops/mês: $0.44
Total: ~$2.64/mês
```

---

## RECOMENDAÇÕES

### Prioridade de Implementação
1. **Fase 1** (Essencial):
   - `kaviar_invites_investor_v1` (já em uso)
   - `kaviar_rides_driver_assigned_v1`
   - `kaviar_rides_passenger_arriving_v1`

2. **Fase 2** (Importante):
   - `kaviar_rides_driver_completed_v1`
   - `kaviar_rides_passenger_completed_v1`

3. **Fase 3** (Nice to have):
   - `kaviar_invites_driver_v1`
   - `kaviar_auth_password_reset_v1`
   - `kaviar_ops_driver_alert_v1`

### Alternativas
Se aprovação demorar ou rejeitar:
- **Opção A**: Usar SMS (Twilio SMS, sem aprovação)
- **Opção B**: Notificações in-app (push notifications)
- **Opção C**: Email (já funciona)

### Monitoramento
```typescript
// Adicionar métricas
console.log('[WhatsApp] Template sent', {
  template,
  to: phone.slice(-4), // Últimos 4 dígitos (LGPD)
  status: 'sent',
  timestamp: new Date().toISOString()
});

// Webhook para status de entrega
// POST /api/webhooks/twilio/status
// Salvar em tabela whatsapp_messages_log
```

---

## RESUMO EXECUTIVO

### Templates Definidos: 8
1. ✅ Convite Investidor
2. ✅ Convite Motorista
3. ✅ Reset Senha
4. ✅ Corrida Atribuída (Motorista)
5. ✅ Corrida Finalizada (Motorista)
6. ✅ Motorista Chegando (Passageiro)
7. ✅ Corrida Finalizada (Passageiro)
8. ✅ Alerta Operacional

### Estratégia
- **Naming**: `kaviar_<dominio>_<evento>_v1`
- **Variáveis**: Padronizadas e documentadas
- **Aprovação**: Todos business-initiated (24-48h)
- **Fallback**: Freeform → Email → In-app
- **Custo**: ~$2.64/mês (100 usuários)

### Próximos Passos
1. Criar templates no Twilio Console
2. Submeter para aprovação WhatsApp
3. Copiar Content SIDs após aprovação
4. Adicionar SIDs às env vars
5. Implementar `whatsapp-templates.ts`
6. Atualizar `whatsapp.ts` com `sendTemplate()`
7. Integrar nos fluxos (invites, rides, ops)

---

**Status**: ✅ ESTRATÉGIA DEFINIDA - Pronta para implementação
