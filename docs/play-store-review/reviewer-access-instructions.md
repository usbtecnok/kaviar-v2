# KAVIAR - Instruções de Acesso para Revisor Google Play

## Objetivo

Este documento reúne as instruções de acesso para o revisor do Google Play testar os apps KAVIAR Passageiro e KAVIAR Motorista.

## KAVIAR Passageiro

Package:

- com.kaviar.passenger

Conta de teste sugerida:

- Email: passageiro.review@kaviar.com.br
- Senha: definir antes do envio ao Play Console

Fluxo para teste:

1. Abrir o app KAVIAR Passageiro.
2. Fazer login com a conta de teste.
3. Acessar a tela inicial.
4. Verificar opções de solicitação de corrida.
5. Permitir localização quando solicitado.
6. Iniciar uma solicitação de corrida em ambiente de teste, se disponível.
7. Verificar notificações, status da solicitação e mensagens internas.

Observação:

O app Passageiro usa localização para definir origem da corrida, melhorar a experiência de solicitação e exibir informações relacionadas à viagem.

## KAVIAR Motorista

Package:

- com.kaviar.driver

Conta de teste sugerida:

- Email: motorista.review@kaviar.com.br
- Senha: definir antes do envio ao Play Console
- Status esperado: motorista aprovado/ativo para teste

Fluxo para teste:

1. Abrir o app KAVIAR Motorista.
2. Fazer login com a conta de teste.
3. Permitir localização quando solicitado.
4. Acessar a tela principal do motorista.
5. Colocar o motorista online.
6. Verificar que o app usa localização para manter disponibilidade operacional.
7. Verificar notificações, status online e telas de viagem, se disponíveis.

## Localização em segundo plano no Motorista

O KAVIAR Motorista usa localização em segundo plano somente quando o motorista está online ou em corrida.

Essa permissão é necessária para:

- manter o motorista disponível na plataforma;
- receber corridas próximas;
- atualizar posição durante a corrida;
- permitir acompanhamento pelo passageiro;
- apoiar segurança e suporte operacional.

A localização em segundo plano não é usada para publicidade, venda de dados ou rastreamento fora do contexto operacional da plataforma.

## Observações para o Play Console

As contas de teste devem estar válidas antes do envio para revisão.

Se algum fluxo depender de corrida real, aprovação manual ou disponibilidade regional, informar ao revisor que a conta de teste já está preparada para acessar as telas principais sem bloqueio.

## Checklist antes do envio

- [ ] Criar ou validar conta passageiro.review@kaviar.com.br
- [ ] Criar ou validar conta motorista.review@kaviar.com.br
- [ ] Garantir que o motorista de teste esteja aprovado/ativo
- [ ] Testar login das duas contas nos APKs finais
- [ ] Inserir as credenciais no campo de instruções de acesso do Play Console
