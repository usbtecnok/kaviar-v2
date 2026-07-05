# KAVIAR Motorista - Declaração de Localização em Segundo Plano

## App

KAVIAR Motorista

## Pacote Android

com.kaviar.driver

## Permissões relacionadas

- android.permission.ACCESS_FINE_LOCATION
- android.permission.ACCESS_COARSE_LOCATION
- android.permission.ACCESS_BACKGROUND_LOCATION
- android.permission.FOREGROUND_SERVICE_LOCATION

## Funcionalidade principal que exige localização

A localização em segundo plano é usada para manter o motorista disponível na plataforma enquanto ele está online e apto a receber viagens.

Sem essa permissão, o app não consegue executar corretamente sua função principal: conectar passageiros a motoristas próximos, acompanhar corridas aceitas e manter a operação de mobilidade funcionando com segurança.

## Quando a localização é usada

A localização é usada quando:

1. O motorista entra no app e fica online.
2. O motorista está disponível para receber chamadas de corrida.
3. O motorista aceita uma corrida.
4. A corrida está em andamento.
5. O sistema precisa atualizar posição operacional para cálculo de rota, proximidade e acompanhamento.

## Por que não basta localização apenas em primeiro plano

O motorista pode estar com o app aberto, minimizado ou com a tela bloqueada enquanto está online, aguardando chamada ou realizando uma corrida.

Se a localização funcionar apenas enquanto a tela do app está aberta, a plataforma pode:

- deixar de mostrar o motorista como disponível;
- deixar de enviar corridas próximas;
- perder atualização de posição durante a corrida;
- prejudicar o acompanhamento pelo passageiro;
- prejudicar segurança e suporte operacional.

## Benefício para o usuário

Para o passageiro:

- encontrar motoristas próximos;
- acompanhar a chegada do motorista;
- acompanhar o andamento da corrida;
- ter mais segurança durante a viagem.

Para o motorista:

- receber chamadas de corrida compatíveis com sua localização;
- manter-se disponível enquanto está online;
- executar corridas sem perder rastreamento operacional.

## Limites de uso

A localização em segundo plano não é usada para publicidade, venda de dados, rastreamento fora do contexto operacional da plataforma ou finalidade não relacionada à mobilidade.

A localização é usada apenas para funcionamento da corrida, disponibilidade do motorista, cálculo operacional, segurança e suporte.

## Texto curto para o Play Console

O KAVIAR Motorista usa localização em segundo plano para manter o motorista disponível quando está online, receber corridas próximas e permitir acompanhamento da corrida pelo passageiro e pela operação. Sem essa permissão, a função principal do app de mobilidade não funciona corretamente.

## Texto para tela de explicação ao usuário

O KAVIAR Motorista usa sua localização enquanto você está online ou em corrida para encontrar passageiros próximos, atualizar sua posição durante o trajeto e manter a operação segura. A localização em segundo plano é necessária para que você continue recebendo chamadas e para que a corrida seja acompanhada mesmo com a tela bloqueada ou o app em segundo plano.
