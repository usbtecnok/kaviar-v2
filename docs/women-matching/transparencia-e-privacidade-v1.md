# TRANSPARÊNCIA E PRIVACIDADE — Preferência por Motorista Mulher

**Versão 1.0 — Junho 2026**
**Status: PROPOSTA — Não publicado**

*KAVIAR — Produto da USB Tecnok Manutenção e Instalação de Computadores Ltda*
*CNPJ 07.710.691/0001-66*

---

## 1. Texto para passageira

> Você pode ativar a preferência para que o KAVIAR tente localizar primeiro uma motorista mulher participante. A preferência não garante disponibilidade. Se nenhuma motorista estiver disponível, você poderá continuar aguardando, ampliar a busca ou cancelar.
>
> Sua participação é voluntária e pode ser desativada a qualquer momento no seu perfil.

## 2. Texto para motorista

> Você pode optar por participar das corridas com preferência por motorista mulher. Sua participação é voluntária e pode ser desativada a qualquer momento.
>
> Ao participar, você poderá receber prioridade em corridas de passageiras que ativaram a preferência, além de continuar recebendo corridas normais.

## 3. Dados armazenados

| Campo | Tabela | Finalidade | Tipo |
|---|---|---|---|
| `women_matching_opt_in` | passengers | Indica que passageira optou por participar do programa | BOOLEAN |
| `prefer_woman_driver_default` | passengers | Preferência padrão ativa para suas corridas | BOOLEAN |
| `women_matching_opt_in` | drivers | Indica que motorista optou por participar como elegível | BOOLEAN |
| `prefer_woman_driver` | rides_v2 | Registra se esta corrida específica tem preferência | BOOLEAN |

## 4. Finalidade do tratamento

Permitir que passageiras expressem preferência por motoristas mulheres para conforto, confiança e segurança percebida, e que motoristas mulheres participem voluntariamente desse programa.

## 5. Acesso aos dados

| Quem | O que vê |
|---|---|
| A própria pessoa | Seu status de participação e preferência |
| SUPER_ADMIN | Lista de participantes (gestão de fraude/inconsistência) |
| Sistema (dispatch) | Flag booleana para priorização de candidatos |
| Outras motoristas | ❌ Nenhuma informação |
| Outros passageiros | ❌ Nenhuma informação |
| Passageiro não-participante | ❌ Funcionalidade não visível |

## 6. Correção e revogação

- **Passageira:** pode desativar participação e preferência a qualquer momento pelo app
- **Motorista:** pode desativar participação a qualquer momento pelo app
- **SUPER_ADMIN:** pode desativar em caso de fraude ou contestação, com motivo registrado
- **Efeito:** imediato na próxima corrida

## 7. Retenção

| Cenário | Tratamento |
|---|---|
| Conta ativa e funcionalidade ativa | Campo mantido enquanto necessário para o serviço |
| Pessoa revoga participação | Campo definido como `false`; efeito imediato |
| Funcionalidade desligada (feature flag OFF) | Campos existem mas são inertes, sem processamento |
| Conta encerrada | Campos removidos com demais dados pessoais, respeitando prazos legais aplicáveis |
| Auditoria de alterações | Retida pelo prazo mínimo necessário para segurança operacional |

## 8. Canal de suporte

Para questões sobre participação, correção ou revogação:
- In-app: seção de configurações/preferências
- E-mail: suporte@kaviar.com.br
- WhatsApp de suporte (quando disponível)

## 9. Não exposição

- A informação de participação NÃO é exibida para outros usuários
- A motorista NÃO sabe que está recebendo uma corrida "com preferência" (vê oferta normal)
- A passageira NÃO vê dados pessoais da motorista além do padrão (nome, foto, veículo)

## 10. Base legal

A base legal deverá ser confirmada após análise jurídica/LGPD específica, considerando autodeclaração, transparência, legítima expectativa, necessidade e riscos de discriminação.

Possíveis bases a avaliar:
- Consentimento (Art. 7º, I, LGPD)
- Execução de contrato / providências pré-contratuais (Art. 7º, V)
- Legítimo interesse (Art. 7º, IX) — com RIPD obrigatório

A definição definitiva será feita antes da ativação da funcionalidade em produção.

---

*KAVIAR — USB Tecnok Manutenção e Instalação de Computadores Ltda — CNPJ 07.710.691/0001-66*
