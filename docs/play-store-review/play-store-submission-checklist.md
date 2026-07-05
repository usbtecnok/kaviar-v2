# KAVIAR - Checklist de Submissão Google Play

## Estado técnico Android

- [x] minSdkVersion 29 validado nos APKs finais
- [x] targetSdkVersion 36 validado nos APKs finais
- [x] compileSdkVersion 36 configurado
- [x] android:allowBackup=false
- [x] CropImageActivity android:exported=false
- [x] Firebase Test Lab Passed no Passageiro
- [x] Firebase Test Lab Passed no Motorista
- [x] APKs internos validados
- [ ] AAB final Passageiro gerado
- [ ] AAB final Motorista gerado
- [ ] Teste fechado criado no Play Console
- [ ] Pre-launch report analisado

## Apps

### KAVIAR Passageiro

Package:

- com.kaviar.passenger

Necessário para Play Console:

- [ ] Nome do app
- [ ] Descrição curta
- [ ] Descrição completa
- [ ] Ícone 512x512
- [ ] Feature graphic 1024x500
- [ ] Screenshots
- [ ] Categoria
- [ ] Email de suporte
- [ ] Política de privacidade
- [ ] Link de exclusão de conta
- [ ] Conta de teste de passageiro
- [ ] Data Safety preenchido

### KAVIAR Motorista

Package:

- com.kaviar.driver

Necessário para Play Console:

- [ ] Nome do app
- [ ] Descrição curta
- [ ] Descrição completa
- [ ] Ícone 512x512
- [ ] Feature graphic 1024x500
- [ ] Screenshots
- [ ] Categoria
- [ ] Email de suporte
- [ ] Política de privacidade
- [ ] Link de exclusão de conta
- [ ] Conta de teste de motorista aprovado
- [ ] Conta de teste de motorista pendente, se necessário
- [ ] Data Safety preenchido
- [ ] Declaração de localização em segundo plano
- [ ] Vídeo ou instrução demonstrando uso da localização, se solicitado pelo Play Console

## Páginas legais públicas

- [x] https://kaviar.com.br/privacidade
- [x] https://kaviar.com.br/termos-passageiro
- [x] https://kaviar.com.br/termos-motorista
- [x] https://kaviar.com.br/excluir-conta

## Dados pessoais e Data Safety

Revisar declaração para:

- Nome
- Telefone
- Localização aproximada
- Localização precisa
- Dados de corrida
- Fotos/documentos do motorista
- Fotos de perfil ou veículo
- Mensagens internas de corrida
- Dados de pagamento quando aplicável
- Push token/notificações
- Identificadores do dispositivo quando aplicável

## Permissões sensíveis

Passageiro:

- Localização precisa
- Câmera
- Armazenamento/imagem
- Notificações

Motorista:

- Localização precisa
- Localização em segundo plano
- Serviço de localização em primeiro plano
- Câmera
- Armazenamento/imagem
- Notificações

## Contas de teste para revisão

Criar e validar:

- [ ] passageiro.review@kaviar.com.br
- [ ] motorista.review@kaviar.com.br

As contas devem permitir que o revisor acesse as áreas principais do app sem depender de aprovação manual desconhecida.

## Instruções para o revisor

Incluir no Play Console:

1. Baixe o app.
2. Faça login com a conta de teste informada.
3. No Passageiro, acesse a tela inicial, solicitação de corrida e mensagens.
4. No Motorista, faça login com conta aprovada, fique online e veja a função de localização usada para disponibilidade e corridas.
5. A localização em segundo plano é usada somente quando o motorista está online ou em corrida.

## Antes de produção pública

- [ ] Subir primeiro em teste fechado
- [ ] Rodar Pre-launch report
- [ ] Corrigir alertas críticos
- [ ] Validar Data Safety
- [ ] Validar App Content
- [ ] Validar política de privacidade
- [ ] Validar exclusão de conta
- [ ] Só depois enviar para revisão pública
