# Play Store Launch Checklist (D0-D3)

Data: 2026-07-03
Escopo: Kaviar Motorista (com.kaviar.driver) e Kaviar Passageiro (com.kaviar.passenger)
Base: docs/play-store-readiness-audit.md

Objetivo deste documento:
- Converter a auditoria em plano operacional executável.
- Definir tarefas, responsável sugerido, evidência esperada e critério de conclusão.
- Priorizar publicação em internal/closed testing e depois produção.

---

## 1) Status geral

### Internal/closed testing
Status: QUASE PRONTO

Condição para iniciar:
- Estratégia de submit por app definida (sem ambiguidade).
- Metadados mínimos de listing organizados.
- Responsável de Play Console nomeado.

### Produção pública
Status: BLOQUEADO

Bloqueadores principais:
- Documentos jurídicos ainda com texto de minuta interna.
- Ausência de página pública clara de exclusão de conta/dados.
- Risco de rejeição por background location no Motorista sem pacote de evidências/disclosure consolidado.

---

## 2) D0 — Documentos públicos e jurídico

## D0.1 Política de privacidade final
- Tarefa: publicar versão jurídica final da política, removendo termos de minuta interna.
- Responsável sugerido: Jurídico + Compliance + Conteúdo Web.
- Evidência esperada: URL pública ativa https://kaviar.com.br/privacidade com versão final e data de vigência.
- Critério de conclusão: texto sem "minuta operacional interna" e alinhado ao Data Safety real.

## D0.2 Termos do Passageiro final
- Tarefa: publicar termos finais do passageiro.
- Responsável sugerido: Jurídico + Produto Passageiro + Conteúdo Web.
- Evidência esperada: URL pública ativa https://kaviar.com.br/termos-passageiro.
- Critério de conclusão: sem aviso de minuta, contatos oficiais corretos, coerente com comportamento real do app.

## D0.3 Termos do Motorista final
- Tarefa: publicar termos finais do motorista.
- Responsável sugerido: Jurídico + Operações Motorista + Conteúdo Web.
- Evidência esperada: URL pública ativa https://kaviar.com.br/termos-motorista.
- Critério de conclusão: sem aviso de minuta, cláusulas compatíveis com onboarding/documentação do motorista.

## D0.4 Exclusão de conta/dados
- Tarefa: publicar página de exclusão (ou instrução oficial equivalente) com passo a passo e SLA.
- Responsável sugerido: Compliance + Suporte + Produto.
- Evidência esperada: URL pública ativa https://kaviar.com.br/excluir-conta (ou página equivalente), com:
  - canal de solicitação
  - dados mínimos solicitados
  - prazo de processamento
  - política de retenção legal
- Critério de conclusão: política de exclusão utilizável e compatível com Play Console Data Deletion.

## D0.5 Remoção explícita dos textos de minuta
- Tarefa: retirar os textos "minuta operacional interna — sujeita a revisão jurídica" dos documentos que serão públicos.
- Responsável sugerido: Jurídico.
- Evidência esperada: diff editorial aprovado e revisão final assinada internamente.
- Critério de conclusão: zero ocorrência de "minuta" nos documentos públicos finais.

## D0.6 URLs públicas obrigatórias
- Tarefa: validar URLs finais e estabilidade HTTP/HTTPS.
- Responsável sugerido: Web/Infra.
- Evidência esperada: checklist de URLs com status 200.
- Critério de conclusão:
  - /privacidade
  - /termos-passageiro
  - /termos-motorista
  - /excluir-conta
  todos acessíveis e prontos para uso no Play Console.

---

## 3) D1 — Play Console

## D1.1 Criar app Kaviar Motorista
- Tarefa: criar ficha do app com package com.kaviar.driver.
- Responsável sugerido: Release Manager (Android).
- Evidência esperada: app criado no Console com appId correto.
- Critério de conclusão: app visível no Console com track internal habilitável.

## D1.2 Criar app Kaviar Passageiro
- Tarefa: criar ficha do app com package com.kaviar.passenger.
- Responsável sugerido: Release Manager (Android).
- Evidência esperada: app criado no Console com appId correto.
- Critério de conclusão: app visível no Console com track internal habilitável.

## D1.3 Configurações básicas de Console
- Tarefa: preencher categoria, contato público, faixa etária, anúncios e classificações para ambos apps.
- Responsável sugerido: Produto + Marketing + Compliance.
- Evidência esperada: prints das telas de política e conteúdo no Console.
- Critério de conclusão: sem pendências obrigatórias no painel de publicação.

## D1.4 Data Safety (ambos apps)
- Tarefa: preencher Data Safety com base no fluxo real de dados (localização, documentos, pagamentos, tokens push, terceiros).
- Responsável sugerido: Compliance + Engenharia Backend + Mobile Lead.
- Evidência esperada: formulário completo salvo e revisado por dupla validação.
- Critério de conclusão: sem inconsistência entre Data Safety, política de privacidade e app real.

## D1.5 Background location (Motorista)
- Tarefa: declarar e justificar uso de localização em segundo plano no Play Console com linguagem objetiva e limitada ao contexto operacional.
- Responsável sugerido: Mobile Lead + Compliance.
- Evidência esperada:
  - texto de justificativa final
  - captura da declaração no Console
  - prova de disclosure no app (conteúdo e momento de exibição)
- Critério de conclusão: pacote de justificativa pronto para revisão do Google sem contradições.

## D1.6 Conta de desenvolvedor organização/empresa
- Tarefa: confirmar que os dois apps serão publicados em conta empresarial da KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA.
- Responsável sugerido: Administrativo + Dono do Console.
- Evidência esperada: dados da conta de desenvolvedor com titular PJ.
- Critério de conclusão: conta validada, pagamentos/identidade do Console em conformidade.

---

## 4) D2 — Materiais da loja

## D2.1 Ícone 512x512
- Tarefa: exportar versão final 512x512 para cada app (motorista e passageiro).
- Responsável sugerido: Design.
- Evidência esperada: 2 arquivos PNG 512x512 aprovados.
- Critério de conclusão: upload aceito sem warnings visuais críticos.

## D2.2 Feature graphic 1024x500
- Tarefa: criar 1 arte por app para listing.
- Responsável sugerido: Design + Marketing.
- Evidência esperada: 2 arquivos 1024x500 aprovados por produto.
- Critério de conclusão: upload aceito no Console para ambos apps.

## D2.3 Screenshots Passageiro
- Tarefa: capturar e selecionar 4-6 telas principais do Passageiro.
- Responsável sugerido: QA Mobile + Design.
- Evidência esperada: pacote de screenshots em alta qualidade.
- Critério de conclusão: mínimo de 2 screenshots aprovado; ideal 4-6 carregados.

## D2.4 Screenshots Motorista
- Tarefa: capturar e selecionar 4-6 telas principais do Motorista, incluindo oferta de corrida e operação online.
- Responsável sugerido: QA Mobile + Design.
- Evidência esperada: pacote de screenshots em alta qualidade.
- Critério de conclusão: mínimo de 2 screenshots aprovado; ideal 4-6 carregados.

## D2.5 Descrição curta
- Tarefa: revisar/aprovar descrição curta para cada app.
- Responsável sugerido: Marketing + Produto.
- Evidência esperada: textos finais aprovados.
- Critério de conclusão: textos publicados no listing sem linguagem sensível de risco (ex.: renda garantida).

## D2.6 Descrição completa
- Tarefa: revisar/aprovar descrição longa para cada app.
- Responsável sugerido: Marketing + Jurídico + Produto.
- Evidência esperada: textos finais aderentes a políticas do Google.
- Critério de conclusão: mensagens comerciais sem claims proibidos e alinhadas ao serviço real.

---

## 5) D3 — Build, upload e teste interno

## D3.1 Comandos EAS para gerar AAB
- Tarefa: executar builds de release (somente após D0-D2).
- Responsável sugerido: Release Manager (Android).
- Evidência esperada: links dos artifacts AAB no EAS.
- Critério de conclusão: AAB gerado com sucesso para ambos apps.

Comandos:
- npx --yes eas-cli@latest build --platform android --profile driver-release
- npx --yes eas-cli@latest build --platform android --profile passenger-release

## D3.2 Verificação de versionCode
- Tarefa: validar versionCode no artefato antes de upload.
- Responsável sugerido: Mobile Lead + QA Release.
- Evidência esperada: relatório simples com appId + versionCode detectado.
- Critério de conclusão:
  - Motorista versionCode >= 6 e monotônico
  - Passageiro versionCode >= 22 e monotônico

## D3.3 Upload/submit interno
- Tarefa: enviar ambos apps para track internal (ou closed) de forma isolada.
- Responsável sugerido: Release Manager.
- Evidência esperada: releases visíveis no Console para cada app.
- Critério de conclusão: usuários de teste conseguem instalar pela Play Store.

Observação operacional:
- Recomenda-se separar profiles de submit por app para evitar ambiguidade do profile único atual.

## D3.4 Testes no app instalado via Play Store
- Tarefa: executar smoke test em build instalado do track internal.
- Responsável sugerido: QA Mobile + Operações.
- Evidência esperada: checklist de testes aprovado por app.
- Critério de conclusão:
  - Motorista: login, ficar online, receber oferta, corrida, push, localização operacional
  - Passageiro: login, solicitar corrida, mapa, push, histórico

## D3.5 Critérios de aprovação antes de produção
- Tarefa: gate final de go/no-go.
- Responsável sugerido: Comitê de release (Produto + Engenharia + Compliance).
- Evidência esperada: ata de aprovação.
- Critério de conclusão: 100% dos bloqueadores críticos resolvidos.

---

## 6) Riscos de rejeição (com ação preventiva)

1. Background location (Motorista)
- Risco: alto.
- Prevenção: justificativa objetiva, disclosure claro e rastreabilidade de uso apenas quando online/corrida.

2. Dados sensíveis/documentos do motorista
- Risco: médio/alto.
- Prevenção: política pública detalhada, minimização de coleta e consistência no Data Safety.

3. Pagamentos/recarga
- Risco: médio.
- Prevenção: textos transparentes sobre fluxo de recarga e provedores (SumUp/Asaas), sem promessas ambíguas.

4. LGPD/exclusão de conta
- Risco: alto.
- Prevenção: página pública de exclusão, SLA, canal de solicitação e processo interno auditável.

5. Promessas comerciais/renda garantida
- Risco: médio.
- Prevenção: linguagem factual, evitar claims de ganho garantido e superlativos sem base.

---

## 7) Ordem recomendada de execução

Fazer primeiro (sequencial obrigatório):
1. D0 completo (jurídico + páginas públicas + exclusão).
2. D1 completo (console + data safety + background location).
3. D2 completo (assets e textos finais).

Pode rodar em paralelo:
- D1.1 e D1.2 (criação dos dois apps no Console).
- D2.1 a D2.6 (produção de materiais e revisão de textos).
- Validação de contato público e identidade de marca entre jurídico/marketing.

Bloqueia produção:
- Qualquer pendência de D0.
- Data Safety inconsistente com app real.
- Falta de evidência adequada para background location no Motorista.

---

## Checklist resumida

## Status
- [ ] Internal/closed testing liberado
- [ ] Produção pública liberada

## D0
- [ ] Política de privacidade final publicada
- [ ] Termos passageiro final publicado
- [ ] Termos motorista final publicado
- [ ] Página de exclusão de conta/dados publicada
- [ ] Remoção de textos de minuta em documentos públicos
- [ ] URLs públicas finais validadas (/privacidade, /termos-passageiro, /termos-motorista, /excluir-conta)

## D1
- [ ] App Motorista criado no Play Console
- [ ] App Passageiro criado no Play Console
- [ ] Categoria, contato, idade, anúncios preenchidos
- [ ] Data Safety preenchido e revisado
- [ ] Background location do Motorista declarado com justificativa robusta
- [ ] Conta de desenvolvedor empresarial validada

## D2
- [ ] Ícone 512x512 (Motorista)
- [ ] Ícone 512x512 (Passageiro)
- [ ] Feature graphic 1024x500 (Motorista)
- [ ] Feature graphic 1024x500 (Passageiro)
- [ ] Screenshots Passageiro (mín 2; ideal 4-6)
- [ ] Screenshots Motorista (mín 2; ideal 4-6)
- [ ] Descrição curta final (ambos)
- [ ] Descrição completa final (ambos)

## D3
- [ ] Build AAB Motorista executado
- [ ] Build AAB Passageiro executado
- [ ] VersionCode validado no artefato (Motorista)
- [ ] VersionCode validado no artefato (Passageiro)
- [ ] Submit interno Motorista concluído
- [ ] Submit interno Passageiro concluído
- [ ] Smoke test via instalação Play Store aprovado (Motorista)
- [ ] Smoke test via instalação Play Store aprovado (Passageiro)
- [ ] Gate de aprovação para produção assinado
