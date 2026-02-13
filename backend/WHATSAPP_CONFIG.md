# KAVIAR WhatsApp + Twilio - Configuração Final

## 📱 Números em Uso

- **WhatsApp (Templates HX)**: +55 21 96864-8777
- **Verify VOICE/SMS**: +55 21 2391 5686
- ~~Número US +1 413 475 9634~~ (ignorado - demo)

## 🔐 Variáveis de Ambiente

### Obrigatórias (Twilio Base)
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### WhatsApp Templates (Content API)
```bash
TWILIO_WHATSAPP_ENABLED=true
TWILIO_WHATSAPP_FROM=whatsapp:+5521968648777
```

### Verify VOICE (Twilio BR)
```bash
TWILIO_VERIFY_VOICE_ENABLED=true
TWILIO_VERIFY_VOICE_NUMBER=+552123915686
TWILIO_VERIFY_VOICE_WEBHOOK_PATH=/api/twilio/verify-voice
```

## 📋 Templates Aprovados

Todos os templates estão registrados em `backend/src/modules/whatsapp/whatsapp-templates.ts`:

- `kaviar_ops_driver_alert_v1`
- `kaviar_rides_driver_assigned_v1`
- `kaviar_rides_started_v1`
- `kaviar_rides_driver_arrived_v1`
- `kaviar_rides_passenger_driver_arriving_v1`
- `kaviar_rides_driver_completed_v1`
- `kaviar_rides_passenger_completed_v1`
- `kaviar_rides_cancelled_v1`
- `kaviar_rides_passenger_cancelled_v1`
- `kaviar_rides_driver_cancelled_v1`
- `kaviar_rides_destination_changed_v1`
- `kaviar_invites_driver_v1`
- `kaviar_payment_receipt_v1`
- `copy_kaviar_auth_password_reset_v1`
- `copy_kaviar_auth_verification_code_v1`

## 🚀 Uso no Código

```typescript
import { whatsappEvents } from "./modules/whatsapp";

// Exemplo: notificar motorista
await whatsappEvents.rideDriverAssigned("+5521999999999", {
  "1": "João Silva",
  "2": "Rua ABC, 123",
  "3": "15:30"
});
```

## ✅ Verificação

```bash
cd /home/goes/kaviar/backend
node -e "console.log('WA enabled?', process.env.TWILIO_WHATSAPP_ENABLED, 'FROM', process.env.TWILIO_WHATSAPP_FROM); console.log('SID/TOKEN set?', !!process.env.TWILIO_ACCOUNT_SID, !!process.env.TWILIO_AUTH_TOKEN)"
```

Esperado:
```
WA enabled? true FROM whatsapp:+5521968648777
SID/TOKEN set? true true
```

## 🔧 Webhook Twilio

No console Twilio, configurar o número +55 21 2391 5686:

**Voice Webhook**: `POST https://api.kaviar.com.br/api/twilio/verify-voice`

## 📦 Estrutura

```
backend/src/modules/whatsapp/
├── whatsapp-templates.ts    # Registry de templates aprovados
├── whatsapp-client.ts       # Client Twilio + validação env
├── whatsapp.service.ts      # Service de envio via Content API
├── whatsapp-events.ts       # Facade de eventos
└── index.ts                 # Exports centralizados
```

## ⚠️ Segurança

- **NUNCA** commitar `TWILIO_ACCOUNT_SID` ou `TWILIO_AUTH_TOKEN`
- Usar apenas ENV/Secrets do ambiente (Render, AWS, etc)
- Não criar endpoints de teste para evitar spam
