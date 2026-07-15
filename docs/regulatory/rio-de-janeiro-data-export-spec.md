# Rio de Janeiro/RJ - Especificacao preliminar de exportacao de dados (modo standby)

## Objetivo

Manter um modelo tecnico preliminar para eventual envio regulatorio de dados no Rio de Janeiro (CAR), condicionado a confirmacao formal da SMTR sobre ato, canal e layout vigentes.

## Status regulatorio interno de referencia

- regulation_status: REGULATED
- platform_compliance_status: AWAITING_SMTR_FORMAL_CONFIRMATION

## Observacao critica de vigencia

- Em 15/07/2026, nao ha confirmacao operacional geral para CSV mensal de CAR nos moldes de 2021.
- Este documento NAO representa obrigacao vigente confirmada.
- Este documento NAO autoriza implementacao de exportacao automatica.

## Premissas

- Especificacao preparatoria e nao normativa.
- Sem envio automatico nesta fase.
- Uso apenas para prontidao tecnica, aguardando resposta oficial.

## Campos tecnicos que podem existir internamente

- Identificador interno da corrida.
- Data/hora de inicio e fim da corrida.
- Identificador interno do condutor.
- Identificador interno do passageiro.
- Valor total da corrida.
- Status da corrida.

## Campos dependentes de confirmacao oficial

- Eventual identificador regulatorio municipal do condutor.
- Eventual marcador de competencia regulatoria municipal.
- Eventual layout de transmissao (CSV, JSON, API, portal).
- Eventuais regras de validacao, rejeicao e retificacao.

## LGPD e seguranca

- Minimizar dados ao estritamente exigido na confirmacao oficial.
- Definir base legal, finalidade e prazo de retencao antes de qualquer compartilhamento.
- Manter trilha de auditoria por lote e controle de acesso por menor privilegio.

## Schema preliminar (nao oficial)

- trip_id
- trip_started_at
- trip_ended_at
- driver_platform_id
- rider_platform_id
- trip_total_amount
- trip_status

## Regra de uso interno

Este arquivo permanece em modo standby ate confirmacao formal da SMTR. Nao usar como base para afirmar obrigacao vigente em 2026.
