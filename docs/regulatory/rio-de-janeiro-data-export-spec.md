# Rio de Janeiro/RJ - Especificacao de exportacao mensal de dados (SMTR)

## Objetivo

Definir uma especificacao preliminar de dados para obrigacao mensal da plataforma, separando o que ja existe internamente, o que pode faltar, o que e sensivel sob LGPD e o que precisa de confirmacao oficial de layout.

## Premissas

- Esta especificacao e preparatoria e nao substitui layout oficial da Prefeitura/SMTR.
- Nenhuma integracao ou envio automatico sera implementado nesta fase.

## Campos potencialmente existentes na KAVIAR

- Identificador interno da corrida.
- Data/hora de inicio e fim da corrida.
- Identificador do motorista na plataforma.
- Identificador do passageiro na plataforma.
- Valor total da corrida.
- Valor da taxa/plataforma (quando aplicavel ao modelo de negocio).
- Status da corrida (concluida, cancelada etc.).
- Geolocalizacao de origem e destino (quando coletada).

## Campos potencialmente faltantes ou que podem exigir derivacao

- Identificador municipal/regulatorio do motorista (quando exigido no layout oficial).
- Marcador formal de corrida no municipio do Rio (regra geografica oficial).
- Campo fiscal especifico para conciliacao da taxa de 1,5% no formato requerido.
- Versao de schema/layout oficial exigida pela SMTR.

## Campos sensiveis e cuidados LGPD

- Nome completo de motorista e passageiro.
- CPF/CNPJ.
- Telefone e e-mail.
- Coordenadas geograficas detalhadas e historico de deslocamento.
- Qualquer identificador que permita reidentificacao direta do titular.

## Controles recomendados para dados sensiveis

- Minimizar envio para apenas os campos exigidos oficialmente.
- Pseudonimizar quando aceito pela regra oficial.
- Registrar base legal, finalidade e periodo de retencao.
- Restringir acesso interno por principio de menor privilegio.
- Registrar trilha de auditoria por lote enviado.

## Campos pendentes de confirmacao oficial

- Lista exata de campos obrigatorios por corrida.
- Granularidade temporal (diaria, mensal consolidada, por evento).
- Formato tecnico (CSV, JSON, API, portal).
- Regras de validacao e rejeicao de arquivo.
- Prazo de entrega e janela de retificacao.

## Hipotese operacional KAVIAR para preparacao interna

- Preparar extrator mensal em lote com filtros por competencia.
- Preparar dicionario de dados mapeando campo interno para campo regulatorio.
- Preparar mecanismo manual de revisao antes de envio oficial.

## Estrutura preliminar sugerida de schema (nao oficial)

- `trip_id`
- `trip_started_at`
- `trip_ended_at`
- `driver_platform_id`
- `driver_municipal_id` (pendente)
- `rider_platform_id`
- `trip_total_amount`
- `platform_fee_amount`
- `trip_status`
- `origin_lat`
- `origin_lng`
- `destination_lat`
- `destination_lng`
- `city_code` (pendente de regra oficial)
