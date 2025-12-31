# Sistema de Pânico + Áudio Seguro (LGPD)

Sistema de emergência integrado ao Kaviar WhatsApp com conformidade LGPD.

## 🚨 Funcionalidades

### 1. Detecção Automática por Palavras-chave
**Palavras monitoradas**: perigo, socorro, ajuda, emergência, assalto, sequestro, acidente, pânico

**Comportamento**:
- Detecta automaticamente em mensagens recebidas
- Marca conversa como emergência (`is_emergency = true`)
- Cria evento no banco (`trigger_type = 'keyword'`)
- Alerta visual e sonoro no dashboard

### 2. Botão de Pânico Manual
**Endpoint**: `POST /api/messages/panic`

**Payload**:
```json
{
  "phone": "+5511999999999",
  "location": {
    "lat": -23.5505,
    "lng": -46.6333
  }
}
```

**Comportamento**:
- Cria evento de emergência (`trigger_type = 'panic_button'`)
- Envia mensagem automática de protocolo LGPD
- Solicita consentimento explícito para áudio

### 3. Protocolo de Áudio com Consentimento
**Mensagem automática enviada**:
```
🚨 Protocolo de segurança ativado.
Para sua proteção, você deseja enviar um áudio descrevendo a situação?
Se concordar, responda SIM e envie o áudio.
O envio é opcional e será usado apenas para segurança.
```

**Fluxo LGPD**:
1. Usuário responde "SIM" (consentimento explícito)
2. Sistema registra consentimento (`audio_consent_given = true`)
3. Usuário envia áudio pelo WhatsApp
4. Sistema armazena no Supabase Storage (bucket privado)

## 🛡️ Conformidade LGPD

### Princípios Atendidos
- ✅ **Consentimento explícito**: Usuário deve responder "SIM"
- ✅ **Finalidade específica**: Apenas para emergências
- ✅ **Minimização**: Não há gravação automática
- ✅ **Transparência**: Usuário sabe que áudio será armazenado
- ✅ **Acesso restrito**: Apenas admins autenticados
- ✅ **Auditoria**: Todos os eventos são registrados

### Dados Coletados
- **Localização**: Apenas no momento do pânico (pontual)
- **Áudio**: Apenas com consentimento explícito
- **Metadados**: Timestamps, IDs de mensagem, status

## 🖥️ Interface Admin

### Alertas Visuais
- **Conversa em emergência**: Fundo vermelho + badge "EMERGÊNCIA"
- **Animação pulsante**: Chama atenção do operador
- **Alerta popup**: Notificação imediata com som

### Informações Exibidas
- Status da emergência (ativa/resolvida)
- Tipo de gatilho (palavra-chave/botão)
- Localização (se disponível)
- Consentimento de áudio
- Player de áudio (quando disponível)

## 📊 Banco de Dados

### Tabela: `emergency_events`
```sql
- id (UUID)
- conversation_id (FK)
- trigger_type ('keyword', 'panic_button', 'manual')
- trigger_message_id (FK)
- location_lat, location_lng
- audio_consent_given (boolean)
- audio_consent_message_id (FK)
- audio_file_path (Supabase Storage)
- status ('active', 'resolved', 'cancelled')
- resolved_by, resolved_at
- created_at, updated_at
```

### Campos Adicionados: `whatsapp_conversations`
```sql
- is_emergency (boolean)
- emergency_started_at (timestamp)
```

## 🧪 Como Testar

### 1. Teste por Palavra-chave
```
1. Envie mensagem WhatsApp: "SOCORRO, preciso de ajuda!"
2. Veja conversa ficar vermelha no dashboard
3. Alerta sonoro + popup de emergência
```

### 2. Teste do Botão de Pânico
```bash
curl -X POST http://localhost:3000/api/messages/panic \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5511999999999",
    "location": {"lat": -23.5505, "lng": -46.6333}
  }'
```

### 3. Teste de Consentimento de Áudio
```
1. Após pânico, responda: "SIM"
2. Envie áudio pelo WhatsApp
3. Veja registro no banco com consentimento
```

## 🔐 Segurança

- **RLS**: Apenas admins autenticados acessam dados
- **Storage privado**: Áudios em bucket restrito
- **Auditoria completa**: Todos os eventos são logados
- **Retenção**: Definir política de exclusão automática
- **Criptografia**: Supabase gerencia automaticamente

## ⚠️ Limitações Técnicas

- **WhatsApp controla**: Duração e qualidade do áudio
- **Sem gravação automática**: Apenas áudios enviados pelo usuário
- **Formato de áudio**: OGG/MP3 (padrão WhatsApp)
- **Tamanho máximo**: Limitado pelo WhatsApp (16MB)

## 📋 Próximos Passos

1. **Execute**: `database/emergency_system.sql` no Supabase
2. **Configure**: Bucket privado no Supabase Storage
3. **Teste**: Palavras-chave e botão de pânico
4. **Defina**: Política de retenção de dados
5. **Treine**: Operadores no protocolo de emergência
