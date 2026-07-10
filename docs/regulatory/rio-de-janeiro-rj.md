# Rio de Janeiro/RJ - Relatório regulatório preliminar

## Classificacao preliminar

- Municipio: Rio de Janeiro/RJ
- Modalidade: CAR / transporte remunerado privado individual de passageiros por aplicativo
- Status recomendado: REGULATED
- Aplicacao no sistema: NAO APLICAR AINDA
- Motivo: ha obrigacoes da plataforma KAVIAR que precisam ser resolvidas antes de qualquer bloqueio individual de motoristas.

## Fontes oficiais

- [Prefeitura do Rio - decreto sobre transporte por aplicativo](https://prefeitura.rio/fazenda/prefeitura-publica-decreto-para-regulamentar-transporte-por-aplicativo/)
- [Prefeitura do Rio - regras de credenciamento de aplicativos e motoristas](https://prefeitura.rio/transportes/prefeitura-do-rio-publica-regras-de-credenciamento-de-aplicativos-e-motoristas/)
- [Câmara Municipal do Rio - projeto sobre transporte por aplicativos](https://www.camara.rio/comunicacao/noticias/1428-projeto-que-regulamenta-transporte-por-aplicativos-comeca-a-ser-debatido)
- [Câmara Municipal do Rio - pauta com regulamentacao de aplicativos de transporte](https://www.camara.rio/comunicacao/noticias/1480-pauta-semanal-projetos-sobre-licenciamento-de-construcoes-e-regulamentacao-de-aplicativos-de-transporte-voltam-a-ser-debatidos)

## Base oficial identificada

As fontes da Prefeitura informam que o Rio de Janeiro possui regulamentacao municipal para o transporte individual privado remunerado por aplicativo. A nota de 16/03/2021 afirma que a Prefeitura publicou decreto sobre o tema. A nota de 30/03/2021 informa que a SMTR e a Secretaria Municipal de Fazenda e Planejamento publicaram resolucao conjunta com credenciamento obrigatorio de empresas e motoristas.

Na leitura disponivel da pagina oficial, aparece tambem a referencia ao Decreto Rio n° 48.612, de 15 de marco de 2021, citado como base de requisitos dos motoristas parceiros. A pagina oficial menciona ainda o Decreto Rio n° 48.666, de 26 de marco de 2021, como parte do ajuste regulatorio.

## Matriz por ator

### A. Plataforma / KAVIAR

- Credenciamento publico no municipio.
- Taxa de 1,5% sobre o valor total cobrado dos passageiros no mes anterior.
- Pagamento via DARM.
- Envio mensal de dados a SMTR.
- Declaracao de conformidade dos motoristas.
- Risco de advertencia, multa e suspensao do credenciamento em caso de descumprimento.

### B. Motorista

- Credenciamento gratuito junto a SMTR.
- Validade do credenciamento ligada a CNH.
- CNH categoria B ou superior com atividade remunerada.
- Antecedentes criminais.
- Inscricao como contribuinte individual no INSS e espelho do CNIS com ocupacao de motorista.
- Seguros exigidos, incluindo APP, RC-F e DPVAT, conforme a fonte oficial consultada.

### C. Veiculo

- CRLV valido.
- Idade maxima de 10 anos na fonte oficial mais recente consultada.
- Minimo de 4 portas.
- Capacidade maxima de 7 passageiros.
- Declaracao do proprietario ou contrato de locacao quando aplicavel.

## Decisao operacional recomendada

- Nao tratar Rio de Janeiro como NOT_REQUIRED.
- Nao bloquear motoristas do Rio automaticamente ainda.
- Criar pendencia institucional separada para avaliar o credenciamento da plataforma KAVIAR.
- Depois disso, cadastrar a regra municipal para motorista e veiculo, se a decisao interna for seguir com a aplicacao operacional completa.

## Proposta futura de regra sistêmica, sem aplicar

- city: Rio de Janeiro
- state: RJ
- modality: CAR
- regulation_status: REGULATED
- requires_city_approval: true
- responsible_agency: Secretaria Municipal de Transportes do Rio de Janeiro - SMTR
- platform_compliance_required: true

## Riscos

- Bloquear indevidamente motoristas antes de resolver o credenciamento da plataforma.
- Misturar regra de transporte de passageiros com regra de entregas por aplicativo.
- Usar regra antiga ou desatualizada.
- Tratar noticia da Camara como lei vigente sem confirmacao no Diario Oficial.

## Observacao operacional

Este documento e somente um relatorio de pesquisa. Nenhuma regra foi aplicada no sistema, nenhum cadastro foi alterado e nenhum bloqueio foi ativado.