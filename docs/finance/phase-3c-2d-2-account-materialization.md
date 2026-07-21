# Fase 3C-2D.2A — Materialização controlada do catálogo financeiro

Data: 2026-07-21  
Blueprint: `1.0.0`

## Objetivo

Materializar com segurança e idempotência somente contas e categorias
classificadas como `READY` no blueprint financeiro da KAVIAR.

## Escopo validado

- 10 contas financeiras;
- 6 categorias financeiras;
- 0 centros de custo;
- 0 transações financeiras.

Itens pendentes, bloqueados ou rejeitados não são escritos.

## Ações do plano

- `CREATE`: registro deve ser criado;
- `NOOP`: registro existente é compatível;
- `CONFLICT`: divergência estrutural;
- `BLOCKED`: item bloqueado ou rejeitado;
- `SKIPPED`: item ainda depende de decisão.

Em ações `NOOP`, `match_kind` diferencia:

- `EXACT`: estrutura e nome coincidem;
- `COMPATIBLE`: estrutura coincide, mas o nome difere.

## Segurança

Os comandos aceitam exclusivamente:

`FINANCE_MATERIALIZATION_DATABASE_URL`

A `DATABASE_URL` comum é ignorada como origem da conexão.

Antes da importação do Prisma são exigidos:

1. `ALLOW_FINANCE_BLUEPRINT_MATERIALIZATION=true`;
2. `NODE_ENV=development` ou `NODE_ENV=test`;
3. PostgreSQL em `localhost`, `127.0.0.1` ou `::1`;
4. nome do banco contendo `dev` ou `test`;
5. URL exclusiva de materialização.

Não existe comando de aplicação em produção.

## Comandos

Planejamento sem escrita:

    FINANCE_MATERIALIZATION_DATABASE_URL='<URL_LOCAL>'     NODE_ENV=development     ALLOW_FINANCE_BLUEPRINT_MATERIALIZATION=true     npm --prefix backend run finance:accounts:plan

Aplicação exclusivamente local:

    FINANCE_MATERIALIZATION_DATABASE_URL='<URL_LOCAL>'     NODE_ENV=development     ALLOW_FINANCE_BLUEPRINT_MATERIALIZATION=true     npm --prefix backend run finance:accounts:materialize:local

## Transação e idempotência

A aplicação usa transação Prisma com isolamento `Serializable`.

Dentro da mesma transação:

1. carrega o snapshot;
2. reconstrói o plano;
3. recusa conflito ou bloqueio;
4. cria o write-set exato;
5. cria contas e categorias;
6. recarrega o snapshot;
7. confirma que não restam escritas.

Não utiliza `skipDuplicates`. Qualquer falha provoca rollback integral.

Após a primeira aplicação, uma nova execução retorna:

- `total_created: 0`;
- `before_total_writes: 0`;
- `after_total_writes: 0`;
- `idempotent_noop: true`.

## Evidências

Testes unitários:

- 6 arquivos aprovados;
- 29 testes aprovados;
- typecheck aprovado;
- `git diff --check` aprovado.

Integração PostgreSQL local:

- falha proposital durante criação das categorias;
- rollback comprovado;
- aplicação válida: `10|6|0|0`;
- segunda aplicação idempotente;
- 1 teste de integração aprovado.

## Fora do escopo

Esta fase não:

- acessa ou altera produção;
- cria centros de custo pendentes;
- cria lançamentos, rateios ou backfill;
- cria saldos diferentes de zero;
- cria contas individuais por motorista;
- trata os 82% do motorista como despesa da KAVIAR;
- apaga ou atualiza registros existentes;
- publica ou realiza deploy.

Novos itens somente poderão ser materializados após resolução dos estados
`PENDING_ACCOUNTANT`, `PENDING_LEGAL`, `PENDING_ADMIN` e
`BLOCKED_BY_SCHEMA`, com nova versão do blueprint quando necessário.
