# Kaviar WhatsApp Admin Dashboard

Dashboard de monitoramento em tempo real para conversas WhatsApp do Kaviar com **autenticação segura**.

## 🔐 Autenticação

### Primeiro Acesso
1. **Execute o script SQL**: `database/auth_setup.sql` no Supabase
2. **Troque o email**: Altere `admin@kaviar.com` pelo email real do admin
3. **Acesse**: `/login.html`
4. **Credenciais iniciais**:
   - Email: `admin@kaviar.com` (ou o que você definiu)
   - Senha: `@#*Z4939ia4` (temporária)
5. **Troca obrigatória**: Sistema força nova senha no primeiro login

### Recuperação de Senha
- Clique em "Esqueci minha senha" na tela de login
- Digite o email e clique no link
- Verifique o email de recuperação

## 🚀 Como Testar

### 1. Acesso Protegido
```bash
# Tentar acessar sem login
http://localhost:3000
# Resultado: Redirecionado para /login.html
```

### 2. Login Admin
```bash
# Fazer login
http://localhost:3000/login.html
# Email: admin@kaviar.com
# Senha: @#*Z4939ia4
# Resultado: Acesso liberado ao dashboard
```

## 📱 Testando Realtime

### Enviar Mensagem WhatsApp
1. **Twilio Sandbox**: Envie mensagem para `+1 415 523 8886`
2. **Código**: `join <seu-codigo-sandbox>`
3. **Mensagem**: Qualquer texto

### Testando Mensagens Rápidas
1. **Selecione uma conversa** na lista à esquerda
2. **Clique em um botão rápido** (🚗 A caminho, ❌ Cancelada, etc.)
3. **Veja a mensagem** ser enviada automaticamente
4. **Confirme no WhatsApp** do destinatário
5. **Observe no dashboard** a mensagem aparecer instantaneamente

### Testando Envio Manual
1. **Selecione uma conversa** na lista à esquerda
2. **Digite mensagem** na área de input (parte inferior)
3. **Pressione Enter** ou clique no botão ➤
4. **Veja a mensagem** aparecer instantaneamente na conversa
5. **Confirme recebimento** no WhatsApp do destinatário

## 🎯 Funcionalidades

### Interface
- **Lista de conversas** (esquerda): telefone, tipo, última atividade
- **Mensagens** (direita): histórico da conversa selecionada
- **Envio de mensagens**: área de input com botão de envio
- **Filtro**: por tipo de usuário (motorista/passageiro/desconhecido)

### Realtime
- **Novas conversas**: aparecem automaticamente na lista
- **Novas mensagens**: aparecem instantaneamente na conversa ativa
- **Mensagens enviadas**: aparecem imediatamente após envio
- **Atualizações**: timestamp e ordenação automática

### Envio de Mensagens
- **Input inteligente**: auto-resize, Enter para enviar
- **Botões rápidos**: Mensagens pré-definidas para status de corrida
- **Feedback visual**: botão desabilitado durante envio
- **Integração Twilio**: envio via WhatsApp Business API

### Mensagens Rápidas
- **🚗 A caminho**: "Motorista a caminho 🚗"
- **❌ Cancelada**: "Sua corrida foi cancelada ❌"
- **⏳ Aguardando**: "Aguardando confirmação ⏳"
- **📍 Chegou**: "Motorista chegou! 📍"

## 🔐 Segurança

- ✅ **Autenticação obrigatória**: Supabase Auth
- ✅ **RLS restritivo**: Apenas admins autenticados
- ✅ **Anon Key**: Seguro para frontend
- ✅ **Sanitização**: Previne HTML injection
- ✅ **Logout seguro**: Encerra sessão corretamente
- ✅ **Troca de senha**: Obrigatória no primeiro acesso
- ✅ **Recuperação**: Via email do Supabase

## 🛠️ Estrutura Técnica

```
Frontend → Supabase Realtime (postgres_changes)
Backend → Supabase (Service Role)
Twilio → Backend (Webhook)
```

## 📊 Dados Exibidos

### Conversas
- Número de telefone
- Tipo: Motorista/Passageiro/Desconhecido  
- Última mensagem (timestamp)

### Mensagens
- Conteúdo da mensagem
- Direção: Recebida/Enviada
- Horário (formato relativo)

## 🔧 Troubleshooting

### Dashboard não conecta
- Verificar se Realtime está habilitado no Supabase
- Verificar console do navegador para erros

### Mensagens não aparecem
- Verificar se webhook está funcionando
- Verificar logs do backend no Render

### Status "Desconectado"
- Verificar conexão com internet
- Recarregar página

## 📈 Próximas Fases

- [ ] Autenticação admin
- [ ] Resposta via dashboard  
- [ ] Filtros avançados
- [ ] Paginação
- [ ] Métricas operacionais
