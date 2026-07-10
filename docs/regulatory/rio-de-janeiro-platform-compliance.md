# Rio de Janeiro/RJ - Platform compliance (KAVIAR)

## Escopo e restricao desta frente

- Este documento trata apenas de obrigacoes institucionais da KAVIAR como plataforma.
- Nao aplica regra no sistema.
- Nao altera seed, banco, flag, backend, app ou CRM.
- Nao autoriza bloqueio automatico de motoristas do Rio neste momento.

## Classificacao operacional nesta etapa

- Municipio: Rio de Janeiro/RJ
- Modalidade: CAR
- Enquadramento normativo: REGULATED
- Status operacional recomendado agora: PLATFORM_COMPLIANCE_PENDING
- Leitura equivalente para o sistema atual: REGULATED com pendencia institucional documentada.

## Fontes oficiais usadas

### Prefeitura / SMTR / Fazenda

- https://prefeitura.rio/fazenda/prefeitura-publica-decreto-para-regulamentar-transporte-por-aplicativo/
- https://prefeitura.rio/transportes/prefeitura-do-rio-publica-regras-de-credenciamento-de-aplicativos-e-motoristas/
- https://transportes.prefeitura.rio/
- https://transportes.prefeitura.rio/atendimentodigitalsmtr/
- https://transportes.prefeitura.rio/consulta-de-andamento-de-processos/
- https://transportes.prefeitura.rio/competencias/
- https://transportes.prefeitura.rio/lgpd/
- https://fazenda.prefeitura.rio/
- https://carioca.rio/
- https://carioca.rio/orgao/secretaria-municipal-de-transportes-smtr/
- https://processo.rio/

### Diario Oficial / legislacao municipal

- http://doweb.rio.rj.gov.br/
- https://prefeitura.rio/transportes/prefeitura-do-rio-publica-regras-de-credenciamento-de-aplicativos-e-motoristas/ (menciona publicacao em Diario Oficial de resolucao conjunta)
- https://prefeitura.rio/fazenda/prefeitura-publica-decreto-para-regulamentar-transporte-por-aplicativo/ (menciona decreto publicado)

### Camara Municipal (contexto legislativo, nao base operacional principal)

- https://www.camara.rio/comunicacao/noticias/1428-projeto-que-regulamenta-transporte-por-aplicativos-comeca-a-ser-debatido
- https://www.camara.rio/comunicacao/noticias/1480-pauta-semanal-projetos-sobre-licenciamento-de-construcoes-e-regulamentacao-de-aplicativos-de-transporte-voltam-a-ser-debatidos

## Obrigacoes da KAVIAR como plataforma

## A) Credenciamento da plataforma

### O que esta confirmado

- A fonte oficial da Prefeitura informa credenciamento obrigatorio para plataformas e motoristas no municipio.
- A mesma fonte indica resolucao conjunta de SMTR e Secretaria Municipal de Fazenda e Planejamento sobre modos e meios de credenciamento.
- A Prefeitura indica SMTR como orgao de regulacao e fiscalizacao operacional de transportes, com canais de atendimento e postos.

### Orgao responsavel (leitura pratica)

- Nucleo regulatorio e operacional: SMTR.
- Interacao fazendaria e arrecadatoria: Secretaria Municipal de Fazenda e Planejamento.
- Conclusao pratica: tratar como fluxo SMTR + Fazenda, nao como orgao unico isolado.

### Canal oficial atual (mapeamento)

- Canal institucional de duvidas e orientacao: Atendimento Digital SMTR.
- Canais de protocolo e acompanhamento: processo virtual e consulta via SICOP/Processo.Rio (conforme pagina de consulta de andamento da SMTR).
- Canais de apoio: Carioca Digital e Central 1746.
- Canal presencial: postos de atendimento da SMTR.

### O que ainda precisa confirmacao formal da Prefeitura

- Roteiro exato para credenciamento de plataforma de app de passageiros (nome do servico especifico no portal e passo a passo oficial dedicado).
- Lista fechada de documentos exigidos para plataforma nessa fase atual.

## B) Taxa municipal de 1,5%

### Confirmado nas fontes

- Percentual: 1,5%.
- Base de referencia: valor total cobrado dos passageiros nas viagens do mes anterior.
- Sujeito passivo informado na noticia oficial: empresas/plataformas (nao motorista).
- Meio de recolhimento citado: DARM.
- Prazo citado: ate o terceiro dia util de cada mes.

### Ponto de atencao contabil/fiscal

- A fonte jornalistica usa linguagem de alto nivel. O conceito de valor total cobrado deve ser validado juridico-tributariamente com o ato normativo primario e com orientacao fazendaria atual.

## C) Envio mensal de dados a SMTR

### Campos explicitamente citados em fonte oficial

- Nome completo dos motoristas parceiros.
- Numero da CNH.
- Validade da CNH.
- Placa do veiculo utilizado em ao menos uma viagem no municipio no mes anterior.
- Declaracao de conformidade dos motoristas com requisitos normativos.
- Valor total cobrado dos passageiros nas viagens do mes anterior por condutores cadastrados.

### Campos adicionais (nao confirmados como obrigatorios na fonte consultada)

- IDs internos de corrida e timestamps detalhados.
- Geolocalizacao granular.
- CPF em tempo real.

Observacao: esses itens apareceram em debate legislativo na Camara, mas nao devem ser tratados como obrigacao vigente sem confirmacao no ato normativo aplicavel.

## D) Penalidades e riscos

### Confirmado nas fontes

- Advertencia.
- Multa.
- Suspensao do credenciamento (ate cinco anos na materia de credenciamento).

### Riscos operacionais

- Operar sem credenciamento regular ou sem rotina de dados pode gerar risco fiscalizatorio e sancionatorio.
- Falha de governanca em dados pode gerar risco LGPD (base legal, minimizacao, seguranca, trilha de auditoria e atendimento a titular).

### Riscos juridicos de produto

- Bloquear motorista individual antes de regularizar camada institucional da plataforma pode gerar bloqueio indevido em massa.

## E) Separacao de obrigacoes por ator

### Plataforma KAVIAR

- Credenciamento institucional.
- Recolhimento da taxa de 1,5% via DARM no prazo aplicavel.
- Entrega mensal de dados e declaracao de conformidade.
- Governanca LGPD e seguranca da informacao no envio/compartilhamento.

### Motorista

- Credenciamento individual gratuito junto a SMTR.
- Requisitos pessoais (CNH com EAR, seguros, INSS/CNIS, antecedentes).

### Veiculo

- Requisitos de aptidao e documentacao (CRLV, idade maxima, portas/capacidade, etc., conforme norma vigente).

## Checklist de documentos que a KAVIAR deve separar

## Bloco societario e representacao

- Cartao CNPJ atualizado.
- Contrato social e ultimas alteracoes.
- Documento de representacao do signatario (ata, contrato, procuracao, conforme caso).
- Documento de identificacao do representante legal.
- Comprovantes cadastrais municipais/fiscais aplicaveis para operacao da empresa no municipio (confirmar exigencia exata no protocolo oficial).

## Bloco tecnico-operacional

- Descricao tecnica da plataforma (escopo do servico, fluxo de intermedicao, trilha de dados).
- Politica de conformidade dos motoristas (requisitos e controles).
- Modelo de declaracao de conformidade de motoristas.
- Procedimento interno de consolidacao mensal dos dados exigidos pela SMTR.

## Bloco fiscal e arrecadatorio

- Procedimento interno de apuracao da base de 1,5%.
- Procedimento de emissao e pagamento de DARM.
- Controle de competencia (mes anterior), vencimento e comprovacao.

## Bloco juridico-LGPD

- Registro de tratamento de dados compartilhados com ente publico.
- Base legal, minimizacao e retencao.
- Medidas de seguranca e logs de envio.
- Plano de resposta a incidente e atendimento a titulares.

## Checklist de dados que o sistema KAVIAR precisa conseguir exportar

## Minimo confirmado na fonte

- Nome completo do motorista.
- Numero da CNH.
- Validade da CNH.
- Placa do veiculo.
- Indicador/declaracao de conformidade do motorista.
- Valor total cobrado dos passageiros no mes anterior (consolidado por condutores cadastrados, conforme regra aplicavel).

## Requisitos tecnicos recomendados para robustez de compliance

- Extracao mensal versionada por competencia.
- Auditoria de origem dos dados (quem gerou, quando gerou, hash e trilha).
- Exportacao em formato tabular padrao e reprocessavel.
- Validacao automatica de campos obrigatorios antes do envio.
- Guardar protocolo/comprovante de entrega e comprovante de pagamento DARM por competencia.

## Canais oficiais atuais (resultado de verificacao)

- SMTR Atendimento Digital: canal de orientacao e acompanhamento, nao necessariamente protocolo completo para todos os assuntos.
- Consulta de processo: suporte a processo fisico (SICOP) e processo virtual (Processo.Rio), com apoio 1746.
- Carioca Digital: concentrador de servicos e cartas de servico por orgao.
- Processo.Rio: ambiente de processo administrativo digital.
- Diario Oficial (DOWEB): repositorio oficial para publicar atos.

## CERVA

- As noticias da Prefeitura citam o CERVA (Comite para Estudos e Regulamentacao Viaria de Aplicativos).
- Nesta pesquisa, nao foi localizada pagina unica consolidada com procedimento operacional especifico de credenciamento para plataformas de transporte individual por aplicativo.
- Acao recomendada: abrir expediente formal na SMTR solicitando instrucao oficial atualizada do fluxo de credenciamento e referencia do ato vigente.

## Conclusoes solicitadas

## 1) KAVIAR pode iniciar operacao no Rio imediatamente?

- Recomendacao conservadora: nao tratar como liberado sem validar/protocolar a camada institucional de credenciamento da plataforma.
- Motivo: ha obrigacoes expressas de plataforma (credenciamento, taxa, dados periodicos).

## 2) Bloqueio de motorista deve depender da regularizacao da plataforma?

- Sim, na pratica operacional desta etapa.
- Recomendacao: bloquear a decisao de gate individual ate que exista trilha institucional minima de compliance da plataforma.

## 3) Status sistemico recomendado

- Agora: PLATFORM_COMPLIANCE_PENDING.
- Em paralelo de modelagem: manter classificacao juridica de cidade como REGULATED com pendencia institucional documentada.

## Recomendacao operacional final

- Etapa 1 (agora): concluir compliance institucional da plataforma com SMTR/Fazenda (fluxo, protocolo, dados, DARM, governanca LGPD).
- Etapa 2 (depois): com base nessa regularizacao, definir rollout de regra municipal para motorista/veiculo sem risco de bloqueio indevido em massa.
- Etapa 3 (somente com aprovacao interna): implementar regra no sistema.

## Observacao de seguranca de mudanca

Nenhuma regra foi aplicada no sistema nesta frente. Documento apenas.