# Rio de Janeiro/RJ - Plano de acao de platform compliance (KAVIAR)

## Objetivo do plano

Preparar a KAVIAR para protocolar e confirmar o credenciamento institucional como plataforma de transporte remunerado privado individual de passageiros no municipio do Rio de Janeiro/RJ, antes de qualquer decisao de bloqueio municipal de motoristas.

## Status atual

- Status operacional: PLATFORM_COMPLIANCE_PENDING.
- Decisao operacional vigente: nao bloquear motoristas do Rio ainda.
- Escopo desta frente: somente documentacao e preparacao institucional.

## Fontes oficiais de referencia

- https://prefeitura.rio/fazenda/prefeitura-publica-decreto-para-regulamentar-transporte-por-aplicativo/
- https://prefeitura.rio/transportes/prefeitura-do-rio-publica-regras-de-credenciamento-de-aplicativos-e-motoristas/
- https://transportes.prefeitura.rio/atendimentodigitalsmtr/
- https://transportes.prefeitura.rio/consulta-de-andamento-de-processos/
- https://carioca.rio/orgao/secretaria-municipal-de-transportes-smtr/
- https://processo.rio/
- http://doweb.rio.rj.gov.br/

## Leitura consolidada por grau de certeza

## Confirmado por fonte oficial

- Existe regulacao municipal para transporte por aplicativo no Rio.
- Existe obrigacao de credenciamento para plataformas e motoristas.
- Existe taxa de 1,5% atribuida as plataformas, com referencia ao mes anterior.
- Ha mencao de recolhimento por DARM e prazo ate o terceiro dia util de cada mes.
- Ha obrigacao de envio mensal de dados a SMTR.

## Pendente de confirmacao oficial especifica

- Canal unico e atualizado para protocolo de nova plataforma (servico exato e endpoint oficial).
- Lista fechada de documentos exigidos para pessoa juridica neste tipo de credenciamento.
- Layout tecnico oficial de envio de dados (arquivo, API, periodicidade, validacao).
- Codigo de receita exato do DARM e procedimento operacional atualizado.

## Hipotese operacional KAVIAR

- Tratar onboarding institucional como fluxo SMTR + Fazenda (regulatorio + arrecadatorio).
- Tratar go-live da cidade como dependente de compliance institucional minimo comprovado.

## Responsaveis internos sugeridos

- Juridico regulatorio: liderar interpretacao normativa e oficio para SMTR.
- Fiscal/financeiro: definir rotina de DARM e conciliacao mensal.
- DPO/privacidade: validar base legal, minimizacao e controles LGPD.
- Engenharia de dados: preparar extracao mensal e trilha de auditoria.
- Operacoes/PM: coordenar cronograma, aprovacoes e gate de rollout.

## Passo a passo operacional

## Etapa 1 - Preparacao de dossie interno

- Consolidar documentos societarios da empresa.
- Consolidar descricao tecnica da plataforma.
- Consolidar politica de conformidade de motoristas.
- Consolidar minuta de declaracao de conformidade para envio mensal.

## Etapa 2 - Consulta formal a SMTR

- Enviar lista oficial de perguntas (ver arquivo de perguntas SMTR).
- Solicitar confirmacao de canal de protocolo e rito documental.
- Solicitar referencia do ato normativo vigente aplicavel ao credenciamento da plataforma.

## Etapa 3 - Definicao de protocolo

- Abrir protocolo no canal oficial indicado.
- Registrar numero de processo/protocolo, data, orgao e anexos enviados.
- Definir responsavel de acompanhamento semanal ate resposta conclusiva.

## Etapa 4 - Rotina fiscal e de dados

- Definir procedimento mensal da base de calculo da taxa de 1,5%.
- Definir procedimento de emissao/pagamento DARM e guarda de comprovantes.
- Definir rotina de exportacao e envio dos dados mensais exigidos.

## Etapa 5 - Gate operacional

- Nao ativar bloqueio por cidade antes de evidencia minima de compliance institucional.
- Submeter parecer final para aprovacao executiva/juridica.
- Somente apos aprovacao, discutir implementacao de regra no sistema.

## Documentos necessarios (resumo)

- Ver checklist completo em docs/regulatory/rio-de-janeiro-company-documents-checklist.md.

## Pendencias que precisam confirmacao oficial

- Nome do servico/canal oficial para credenciamento de plataforma de transporte por app.
- Lista oficial de anexos obrigatorios da pessoa juridica.
- Especificacao oficial do envio mensal de dados e formato.
- Procedimento oficial de recolhimento da taxa com codigo DARM.

## Criterios de saida desta frente

- Perguntas formais enviadas e respondidas (ou protocolo de consulta em andamento com SLA).
- Rito de credenciamento da plataforma claramente definido.
- Rotina fiscal de taxa e rotina de dados mensais desenhadas.
- Parecer interno recomendando proximo passo (seguir para implementacao ou manter pendencia).

## Restricoes explicitas desta fase

- Nao implementar regra municipal.
- Nao bloquear motoristas do Rio.
- Nao alterar backend/app/CRM.
- Nao alterar seed.
- Nao alterar banco.
- Nao mexer em ENABLE_MUNICIPAL_REGULATORY_GATE.
- Nao rodar deploy.
- Nao publicar OTA.
