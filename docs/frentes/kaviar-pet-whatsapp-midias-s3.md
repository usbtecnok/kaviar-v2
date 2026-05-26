# KAVIAR Pet — WhatsApp Mídias + S3 (Análise Técnica)

**Versão:** v1.0  
**Data:** Maio/2026  
**Status:** Análise técnica — não implementar sem aprovação  
**Objetivo:** Avaliar captura automática de fotos via WhatsApp para homologação e corridas Pet

---

## 1. Estado Atual — O Que Já Existe

### Twilio WhatsApp (já integrado)

| Item | Status | Detalhes |
|------|--------|----------|
| Envio de mensagens | ✅ Funcional | Via templates (Content SID) |
| Recebimento de mensagens | ✅ Funcional | Webhook `/webhooks/twilio/whatsapp` |
| Recebimento de mídia | ✅ Já persiste | `MediaUrl0` + `MediaContentType0` salvos em `wa_messages` |
| Conversas no admin | ✅ Funcional | Tela WhatsAppCentral com listagem e envio |
| Resolução de contato | ✅ | Identifica driver, passenger, guide, consultant_lead |

### Webhook inbound (integrations.ts)

```typescript
const { From, Body, MessageSid, ProfileName, MediaUrl0, MediaContentType0 } = req.body;

// Já persiste:
await prisma.wa_messages.create({
  data: {
    conversation_id: conversation.id,
    direction: 'inbound',
    body: Body,
    twilio_sid: twilioSid,
    media_url: MediaUrl0 || null,      // ← URL temporária da Twilio
    media_type: MediaContentType0 || null,  // ← image/jpeg, image/png, etc.
  },
});
```

**Ponto-chave:** A URL de mídia da Twilio (`MediaUrl0`) é temporária e requer autenticação Twilio para download. Expira após algum tempo. Para persistência, precisa ser baixada e salva no S3.

### Model `wa_messages` (já tem campos de mídia)

```prisma
model wa_messages {
  media_url    String?          // URL temporária Twilio
  media_type   String? @db.VarChar(50)  // image/jpeg, image/png, etc.
}
```

### S3 (já configurado)

| Item | Valor |
|------|-------|
| Bucket | `kaviar-uploads-1769655575` |
| Região | `us-east-2` |
| Client | `@aws-sdk/client-s3` |
| Presigned URLs | ✅ Implementado (`getPresignedUrl`) |
| Upload multer | ✅ Implementado (`uploadToS3`) |
| Tipos permitidos | JPEG, JPG, PNG, PDF |
| Limite | 10 MB |
| Prefixo atual | `certidoes/` |

---

## 2. Fluxo Futuro Proposto

```
┌──────────────────────────────────────────────────────────────────┐
│  FLUXO: FOTO WHATSAPP → S3 → ADMIN                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Motorista/tutor envia foto pelo WhatsApp                     │
│                    ↓                                             │
│  2. Twilio webhook recebe (MediaUrl0 + MediaContentType0)        │
│                    ↓                                             │
│  3. Backend identifica contexto:                                 │
│     • Conversa vinculada a driver? → homologação                 │
│     • Corrida ativa? → foto embarque                             │
│     • Incidente aberto? → evidência                              │
│                    ↓                                             │
│  4. Backend baixa mídia da Twilio (GET com auth)                 │
│                    ↓                                             │
│  5. Backend salva no S3:                                         │
│     kaviar-pet/homologacoes/{driver_id}/{timestamp}.jpg          │
│     kaviar-pet/corridas/{ride_id}/embarque/{timestamp}.jpg       │
│     kaviar-pet/incidentes/{incident_id}/{timestamp}.jpg          │
│                    ↓                                             │
│  6. Backend registra metadados em tabela pet_media               │
│                    ↓                                             │
│  7. Admin/Central exibe fotos para aprovar/reprovar              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Estrutura S3 Proposta

```
kaviar-uploads-1769655575/
├── certidoes/                    ← já existe (documentos de motoristas)
└── kaviar-pet/
    ├── homologacoes/
    │   └── {driver_id}/
    │       ├── capa-protetora-{timestamp}.jpg
    │       ├── kit-higienizacao-{timestamp}.jpg
    │       └── banco-traseiro-{timestamp}.jpg
    ├── corridas/
    │   └── {ride_id}/
    │       ├── embarque-{timestamp}.jpg
    │       └── finalizacao-{timestamp}.jpg
    └── incidentes/
        └── {incident_id}/
            ├── evidencia-1-{timestamp}.jpg
            └── evidencia-2-{timestamp}.jpg
```

---

## 4. Model Proposto: `pet_media`

```prisma
model pet_media {
  id                String   @id @default(uuid())
  
  // Contexto
  context_type      String   // "homologation" | "ride_boarding" | "ride_completion" | "incident"
  context_id        String?  // ID da homologação, corrida ou incidente
  driver_id         String?
  passenger_id      String?
  
  // Arquivo
  s3_key            String   // caminho no S3
  media_type        String   // image/jpeg, image/png, image/webp
  file_size         Int?     // bytes
  original_filename String?
  
  // Origem
  source            String   @default("whatsapp") // "whatsapp" | "admin_upload" | "app"
  wa_message_id     String?  // referência à wa_messages (se veio do WhatsApp)
  phone_from        String?  // número que enviou
  
  // Validação
  validation_status String   @default("pending") // "pending" | "approved" | "rejected"
  validated_by      String?  // admin_id
  validated_at      DateTime?
  rejection_reason  String?
  
  // Metadados
  notes             String?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
}
```

---

## 5. Download de Mídia da Twilio

### Como funciona

A URL em `MediaUrl0` tem formato:
```
https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages/{MessageSid}/Media/{MediaSid}
```

### Autenticação necessária

```typescript
import fetch from 'node-fetch';

async function downloadTwilioMedia(mediaUrl: string): Promise<Buffer> {
  const auth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString('base64');
  
  const response = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${auth}` },
    redirect: 'follow', // Twilio redireciona para URL real
  });
  
  return Buffer.from(await response.arrayBuffer());
}
```

### Upload para S3

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';

async function uploadPetMedia(buffer: Buffer, key: string, contentType: string) {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}
```

---

## 6. Avaliação de Viabilidade

### O que pode ser reaproveitado

| Componente | Reaproveitável | Observação |
|------------|:--------------:|------------|
| Webhook Twilio inbound | ✅ | Já recebe `MediaUrl0` e `MediaContentType0` |
| S3 Client | ✅ | Já configurado em `s3-upload.ts` |
| Presigned URLs | ✅ | Já implementado para download seguro |
| `wa_messages.media_url` | ✅ | Já persiste URL temporária |
| `wa_conversations` | ✅ | Já resolve contato (driver, passenger) |
| Admin WhatsApp | ✅ | Já mostra conversas e mensagens |
| Multer + fileFilter | ✅ | Já valida JPEG/PNG/PDF |

### O que precisa ser criado

| Item | Tipo | Complexidade |
|------|------|:------------:|
| Tabela `pet_media` | Migration | Baixa |
| Função `downloadTwilioMedia` | Service | Baixa |
| Função `uploadPetMedia` | Service | Baixa |
| Hook no webhook inbound | Alteração | Média |
| Tela de validação de fotos no admin | Frontend | Média |
| Lógica de contexto (qual homologação?) | Backend | Média |

---

## 7. Riscos e Considerações

### Custo/Storage

| Cenário | Estimativa |
|---------|-----------|
| 1 motorista homologado | ~3 fotos × 2 MB = 6 MB |
| 10 motoristas | 60 MB |
| 100 motoristas | 600 MB |
| 1000 corridas/mês (1 foto cada) | 2 GB/mês |
| **Custo S3 (1 GB)** | ~$0.023/mês |

**Risco de custo:** Negligível. Mesmo com 1000 fotos/mês, custo < $1/mês.

### Limites

| Limite | Valor |
|--------|-------|
| Tamanho máximo WhatsApp | 16 MB (imagem) |
| Tamanho recomendado | ≤ 5 MB |
| Tipos permitidos | JPEG, PNG, WebP |
| Retenção Twilio | Mídia expira (baixar imediatamente) |

### Privacidade / LGPD

| Aspecto | Tratamento |
|---------|-----------|
| Dados pessoais | Fotos podem conter placa, rosto — dados sensíveis |
| Base legal | Execução de contrato (prestação de serviço) |
| Retenção | Definir prazo (sugestão: 1 ano após última corrida) |
| Exclusão | Implementar rotina de limpeza S3 por prazo |
| Acesso | Apenas SUPER_ADMIN, PET_ADMIN, PET_OPERATOR |
| Presigned URLs | Expiram em 1h — não expõem arquivo permanentemente |
| Auditoria | Registrar quem visualizou/aprovou (audit log existente) |

### Quem pode visualizar

| Role | Acesso |
|------|--------|
| SUPER_ADMIN | Todas as fotos |
| PET_ADMIN | Todas as fotos Pet |
| PET_SUPERVISOR | Fotos da sua equipe |
| PET_OPERATOR | Fotos dos motoristas que acompanha |
| Motorista | Apenas suas próprias fotos (futuro, via app) |

---

## 8. Fases de Implementação

### Fase A — Manual no piloto (AGORA)

- Fotos recebidas via WhatsApp da Central
- Operadora salva manualmente no Google Drive
- Validação visual pela operadora
- Registro na planilha Sheets
- **Sem código, sem migration**

### Fase B — Upload manual pelo admin

- Tela no admin para upload de fotos (drag & drop)
- Salva no S3 com prefixo `kaviar-pet/`
- Vincula a motorista/homologação
- Presigned URL para visualização
- **Precisa:** migration (`pet_media`), rota API, tela frontend

### Fase C — Captura automática via WhatsApp

- Webhook inbound detecta mídia em conversa Pet
- Baixa da Twilio e salva no S3 automaticamente
- Registra em `pet_media` com `source: "whatsapp"`
- Notifica operadora no admin
- **Precisa:** alteração no webhook, service de download

### Fase D — Vínculo automático com corrida/homologação

- Sistema identifica contexto automaticamente:
  - Conversa vinculada a driver em homologação → foto de kit
  - Corrida ativa do driver → foto de embarque
  - Incidente aberto → evidência
- Classificação automática (ou semi-automática com confirmação)
- **Precisa:** lógica de contexto, possivelmente ML futuro

---

## 9. Recomendação — Menor Caminho Seguro

### Agora: Fase A (manual)
Já está funcionando. Fotos via WhatsApp → Drive → planilha.

### Próximo passo recomendado: Fase B
- Criar `pet_media` (migration simples)
- Reutilizar S3 existente (mesmo bucket, novo prefixo)
- Tela de upload no admin (dentro de `/admin/pet`)
- Presigned URLs para visualização segura
- **Não mexe no webhook** — fotos são uploadadas manualmente pela operadora

### Depois: Fase C
- Só após validar Fase B com volume real
- Alteração cirúrgica no webhook (adicionar hook condicional)
- Baixar mídia → S3 → registrar

### Não fazer ainda: Fase D
- Classificação automática é prematura
- Esperar ter volume e padrões claros

---

## 10. Migration Necessária (quando autorizado)

```sql
CREATE TABLE pet_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type VARCHAR(30) NOT NULL,
  context_id UUID,
  driver_id UUID,
  passenger_id UUID,
  s3_key TEXT NOT NULL,
  media_type VARCHAR(50) NOT NULL,
  file_size INTEGER,
  original_filename TEXT,
  source VARCHAR(20) DEFAULT 'whatsapp',
  wa_message_id UUID,
  phone_from VARCHAR(20),
  validation_status VARCHAR(20) DEFAULT 'pending',
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pet_media_context ON pet_media(context_type, context_id);
CREATE INDEX idx_pet_media_driver ON pet_media(driver_id);
CREATE INDEX idx_pet_media_status ON pet_media(validation_status);
```

---

## 11. Resumo Executivo

| Pergunta | Resposta |
|----------|----------|
| Twilio já recebe mídia? | ✅ Sim, `MediaUrl0` + `MediaContentType0` |
| Webhook existe? | ✅ `/webhooks/twilio/whatsapp` |
| S3 existe? | ✅ `kaviar-uploads-1769655575` |
| Precisa migration? | Sim (tabela `pet_media`) — mas não agora |
| Precisa backend novo? | Sim (service download + rota) — mas não agora |
| Pode começar sem código? | ✅ Fase A (manual) já funciona |
| Risco de custo? | Negligível (< $1/mês para piloto) |
| LGPD? | Presigned URLs + retenção + audit log |
| Menor passo seguro? | Fase B (upload manual no admin) |

---

*KAVIAR Pet — WhatsApp Mídias + S3 — Análise Técnica v1.0 — Maio/2026*
