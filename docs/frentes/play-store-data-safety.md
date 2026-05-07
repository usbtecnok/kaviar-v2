# Play Store — Data Safety Declaration

Mapeamento para preencher o formulário "Data safety" no Google Play Console.

## Kaviar Passageiro

### Dados coletados

| Tipo de dado | Coletado | Compartilhado | Finalidade | Obrigatório |
|---|---|---|---|---|
| Nome | ✅ | Com motorista (durante corrida) | Funcionalidade do app | Sim |
| E-mail | ✅ | Não | Gerenciamento de conta | Sim |
| Telefone | ✅ | Não | Gerenciamento de conta | Sim |
| Localização aproximada | ✅ | Com motorista (durante corrida) | Funcionalidade do app | Sim |
| Localização precisa | ✅ | Com motorista (durante corrida) | Funcionalidade do app | Sim |
| Histórico de corridas | ✅ | Não | Funcionalidade do app | Sim |
| Device ID / tokens push | ✅ | Não | Funcionalidade do app (notificações) | Sim |

### Práticas de segurança
- ✅ Dados criptografados em trânsito (TLS)
- ✅ Usuário pode solicitar exclusão de dados
- ❌ Dados NÃO são vendidos a terceiros

### Localização
- Coletada apenas em **primeiro plano** (foreground)
- Finalidade: encontrar motoristas próximos e acompanhar corrida

---

## Kaviar Motorista

### Dados coletados

| Tipo de dado | Coletado | Compartilhado | Finalidade | Obrigatório |
|---|---|---|---|---|
| Nome | ✅ | Com passageiro (durante corrida) | Funcionalidade do app | Sim |
| E-mail | ✅ | Não | Gerenciamento de conta | Sim |
| Telefone | ✅ | Com passageiro (durante corrida) | Funcionalidade do app | Sim |
| Documentos (CNH) | ✅ | Não | Verificação de identidade | Sim |
| Dados do veículo | ✅ | Não | Funcionalidade do app | Sim |
| Chave Pix | ✅ | Não | Pagamentos/ganhos | Sim |
| Localização aproximada | ✅ | Com passageiro (durante corrida) | Funcionalidade do app | Sim |
| Localização precisa | ✅ | Com passageiro (durante corrida) | Funcionalidade do app | Sim |
| Histórico de corridas | ✅ | Não | Funcionalidade do app | Sim |
| Device ID / tokens push | ✅ | Não | Funcionalidade do app (notificações) | Sim |

### Práticas de segurança
- ✅ Dados criptografados em trânsito (TLS)
- ✅ Usuário pode solicitar exclusão de dados
- ❌ Dados NÃO são vendidos a terceiros

### Localização
- Coletada em **primeiro plano e segundo plano** (foreground + background)
- Finalidade: receber corridas quando disponível, enviar posição ao passageiro durante corrida
- O motorista controla: fica offline = para de coletar

---

## Justificativa para localização em segundo plano (Motorista)

Texto para o formulário do Google Play:

> O Kaviar Motorista é um app de transporte comunitário. A localização em segundo plano é necessária para que o motorista possa receber solicitações de corrida de passageiros próximos enquanto o app está minimizado. Sem essa permissão, o motorista perderia corridas quando o app não estiver em primeiro plano. A coleta é ativada apenas quando o motorista escolhe ficar "online" e pode ser desativada a qualquer momento ficando "offline". A localização também é usada para enviar a posição do motorista ao passageiro em tempo real durante a corrida.

---

## Permissões declaradas

### Motorista
| Permissão | Justificativa |
|-----------|---------------|
| ACCESS_FINE_LOCATION | Posição precisa para matching com passageiros |
| ACCESS_BACKGROUND_LOCATION | Receber corridas com app minimizado |
| FOREGROUND_SERVICE_LOCATION | Manter rastreamento durante corrida ativa |
| POST_NOTIFICATIONS | Alertar sobre novas corridas |
| INTERNET | Comunicação com servidor |
| VIBRATE | Alerta tátil de nova corrida |

### Passageiro
| Permissão | Justificativa |
|-----------|---------------|
| ACCESS_FINE_LOCATION | Encontrar motoristas próximos |
| POST_NOTIFICATIONS | Atualizações de status da corrida |
| INTERNET | Comunicação com servidor |
| VIBRATE | Alerta tátil |

### Permissões NÃO solicitadas
- ❌ Contatos
- ❌ SMS
- ❌ Chamadas telefônicas
- ❌ Câmera (exceto upload de documento no cadastro motorista)
- ❌ Microfone
- ❌ Armazenamento externo
