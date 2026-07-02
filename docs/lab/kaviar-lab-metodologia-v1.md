# KAVIAR Lab — Metodologia v1 Experimental

## 1. O que é o KAVIAR Lab

O KAVIAR Lab é uma frente de inteligência territorial do KAVIAR voltada à análise da maturidade operacional de bairros, comunidades e territórios atendidos pela plataforma.

A primeira versão funciona como painel interno de leitura, usando métricas agregadas já existentes no sistema, sem alterar o fluxo de corridas, motoristas, passageiros, pagamentos, créditos, geofence ou aplicativos.

## 2. Objetivo

O objetivo é permitir que a operação visualize, por território, sinais de maturidade, crescimento, fragilidade ou oportunidade operacional.

O KAVIAR Lab ajuda a responder perguntas como:

- Quais bairros já têm força operacional?
- Onde há passageiros, mas faltam motoristas?
- Onde há motoristas, mas pouca demanda?
- Onde há muitas corridas sem atendimento?
- Onde existe dependência de motorista externo?
- Onde faz sentido ativar operador territorial, parceiro local ou associação?

## 3. Score de Maturidade Territorial

O Score de Maturidade Territorial é um indicador experimental de 0 a 100 pontos.

Ele mede a maturidade operacional de um território com base em dados agregados da plataforma.

O score não avalia pessoas individualmente. Ele não serve para julgar motoristas, passageiros ou moradores. Ele serve para observar a condição operacional de um bairro ou território.

## 4. Metodologia v1 — experimental

A metodologia v1 usa pesos experimentais. Esses pesos devem ser observados em produção e poderão ser calibrados conforme o KAVIAR acumular mais dados reais.

Composição do score:

- 25 pontos: presença de motoristas aprovados
- 20 pontos: taxa de corridas locais
- 20 pontos: rapidez média de aceite
- 15 pontos: taxa de não cancelamento
- 10 pontos: avaliação média
- 5 pontos: presença de operador territorial ativo
- 5 pontos: presença de parceiro territorial ativo

Total máximo: 100 pontos.

## 5. Status derivado do score

- 0 a 24: Em formação
- 25 a 49: Emergindo
- 50 a 74: Operacional
- 75 a 89: Forte
- 90 a 100: Maduro

## 6. Dados permitidos

O KAVIAR Lab pode exibir apenas dados agregados por bairro, território e período, como:

- nome do bairro;
- cidade;
- território operacional;
- total de motoristas aprovados;
- total de motoristas online;
- total de passageiros cadastrados;
- total de corridas;
- corridas locais;
- corridas externas;
- corridas canceladas;
- tempo médio de aceite;
- avaliação média, quando houver volume mínimo;
- presença de operador territorial;
- presença de parceiro territorial;
- score de maturidade;
- status derivado.

## 7. Dados proibidos

O KAVIAR Lab não deve exibir dados pessoais ou individualizados, incluindo:

- nome de passageiro;
- nome de motorista;
- telefone;
- e-mail;
- CPF;
- RG;
- CNH;
- chave Pix;
- endereço completo;
- localização individual;
- foto;
- documento;
- token;
- device ID;
- histórico individual de corrida;
- saldo individual;
- repasse individual;
- valores financeiros por pessoa.

## 8. Regras de privacidade e segurança

A frente deve respeitar LGPD, privacidade e segredo operacional da KAVIAR.

As métricas devem ser agregadas. Nenhuma informação individual deve ser exposta.

A rota deve permanecer protegida por autenticação admin.

A visualização inicial deve ser restrita a:

- SUPER_ADMIN
- OPERATOR

ANGEL_VIEWER não deve acessar esta tela na primeira fase.

## 9. Potencial científico e institucional

O KAVIAR Lab possui potencial científico e institucional imediato porque o KAVIAR coleta dados primários reais de mobilidade territorial.

Esses dados podem apoiar relatórios futuros sobre:

- mobilidade comunitária;
- maturidade territorial;
- geração de renda local;
- dependência de motorista externo;
- evolução operacional por bairro;
- impacto de operadores e parceiros locais;
- relação entre oferta de motoristas e demanda de passageiros.

A frente pode futuramente apoiar apresentações para associações, prefeituras, universidades, parceiros e investidores.

## 10. Limitações da v1

A metodologia v1 ainda é experimental.

Limitações conhecidas:

- os pesos ainda precisam ser calibrados;
- o score depende da qualidade dos dados existentes;
- bairros com poucos dados podem ter score baixo ou instável;
- avaliações médias só devem aparecer com volume mínimo;
- a v1 ainda não possui snapshot histórico;
- a v1 ainda não exporta relatório CSV/PDF;
- a v1 ainda não mede evolução temporal.

## 11. Próximas fases possíveis

Fases futuras:

1. Snapshot histórico do score por bairro.
2. Curva de evolução territorial.
3. Exportação CSV.
4. Exportação PDF.
5. Relatório institucional para associação, prefeitura ou universidade.
6. Metodologia versionada.
7. Comparação entre territórios.
8. Indicadores de impacto local.
9. Painel específico para operadores territoriais.
10. Painel institucional com dados agregados e seguros.

## 12. Regra de ouro

O KAVIAR Lab deve fortalecer a inteligência territorial do KAVIAR sem comprometer segurança, privacidade ou estabilidade operacional.

Nesta frente, é proibido alterar:

- app passageiro;
- app motorista;
- APKs;
- dispatch;
- geofence;
- preço;
- créditos;
- pagamentos;
- push notifications;
- fluxo de corrida;
- banco de dados sem aprovação;
- migrations sem aprovação.
