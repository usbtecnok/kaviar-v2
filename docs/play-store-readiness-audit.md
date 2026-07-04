# Auditoria de Prontidão Play Store (Android)

Data: 2026-07-03
Escopo: Kaviar Motorista (com.kaviar.driver) e Kaviar Passageiro (com.kaviar.passenger)
Objetivo: avaliar prontidão para publicar em teste interno/closed testing e depois produção, sem alterar código.

---

## 1) Status geral

Status consolidado: QUASE PRONTO (para teste interno), BLOQUEADO (para produção pública) até resolver itens legais e de compliance.

Leitura objetiva:
- Técnico de build/base Android: majoritariamente pronto.
- Listing e operação de Console: parcialmente pronto (há guia interno, mas sem evidência de assets finais de listing no repositório).
- Jurídico/compliance: bloqueador para produção (documentos ainda em minuta interna).
- Política de exclusão de conta/dados: incompleto para exigências atuais do Play.

---

## 2) Evidências coletadas (resumo)

### Configuração dos apps
- app.config.js
  - Motorista: package com.kaviar.driver, version 1.12.1, versionCode 6
  - Passageiro: package com.kaviar.passenger, version 1.13.8, versionCode 22
  - Permissões motorista incluem background location e foreground service location
  - Permissões passageiro não incluem background location
  - blockedPermissions remove RECORD_AUDIO e SYSTEM_ALERT_WINDOW

### EAS build/submit
- eas.json
  - build profiles store AAB existentes: driver-release e passenger-release
  - submit profile único: production (track internal), serviceAccountKeyPath ./play-store-key.json

### SDK efetivo Android
- gradle properties efetivas do módulo app:
  - compileSdkVersion: 36
  - targetSdkVersion: 36
  - minSdkVersion: 24

Conclusão: atende requisito de nova submissão (API 35+).

### Chave Play Console
- play-store-key.json:
  - está ignorado por .gitignore
  - arquivo não existe no workspace atual

### Firebase / google-services
- google-services.json contém client para com.kaviar.driver
- google-services-passenger.json contém clients para com.kaviar.driver e com.kaviar.passenger
- app.config.js aponta corretamente driver -> google-services.json e passenger -> google-services-passenger.json

### Assets base
- Ícones e splash existem:
  - icon-driver.png 1024x1024
  - icon-passenger.png 1024x1024
  - adaptive-icon-driver.png 1024x1024
  - adaptive-icon-passenger.png 1024x1024
  - splash-driver.png 1284x2778
  - splash-passenger.png 1284x2778

Observação de listing: Google Play exige ícone hi-res 512x512 para upload no listing. O repositório hoje tem os ícones em 1024x1024 (ótimos para origem, mas ainda falta derivar/exportar artefato de listing 512x512).

### Documentos legais
- docs/politica-privacidade-kaviar-v1.md: marcado como minuta operacional interna, sujeita a revisão jurídica
- docs/termos-uso-passageiro-kaviar-v1.md: idem
- docs/termos-uso-motorista-kaviar-v1.md: idem

Conclusão: bloqueador jurídico para publicação pública.

### Exclusão de conta/dados
- Há menções de direito de exclusão nos textos legais e no guia de data safety.
- Não foi encontrada evidência clara de página pública dedicada de exclusão (ex.: /excluir-conta) nem fluxo explícito de autoatendimento no app para solicitação.

Conclusão: alto risco para política de data deletion no Play (precisa página pública e instrução operacional clara).

### Estrutura nativa Android (risco operacional)
- android/app/src/main/java contém apenas namespace com.kaviar.passenger no workspace atual.

Risco: sem processo explícito e reprodutível por variante antes do build, há chance de inconsistência entre APP_VARIANT, namespace/applicationId nativo e artefato final.

---

## 3) Checklist por app

## 3.1 Kaviar Motorista

Pronto agora:
- package declarado: com.kaviar.driver
- versionCode declarado: 6
- profile de build AAB: driver-release
- background location declarado no app config (coerente com caso de uso)
- fluxo de pagamentos/recarga com SumUp/Asaas já existente

Falta / validar antes de teste interno:
- confirmar pipeline reprodutível da variante motorista no projeto com android nativo presente
- criar submit profile dedicado para motorista (evitar ambiguidades)
- preparar assets de listing (feature graphic + screenshots + ícone 512x512 derivado)
- preparar disclosure in-app muito claro para localização em segundo plano (momento e finalidade)

Falta / bloquear antes de produção:
- política de privacidade e termos sem status de minuta
- URL pública final de privacidade e termos motorista
- URL/página pública de exclusão de conta/dados
- consistência final entre Data Safety e comportamento real (background location e documentos sensíveis)

## 3.2 Kaviar Passageiro

Pronto agora:
- package declarado: com.kaviar.passenger
- versionCode declarado: 22
- profile de build AAB: passenger-release
- sem ACCESS_BACKGROUND_LOCATION no app config (coerente)

Falta / validar antes de teste interno:
- submit profile dedicado para passageiro
- assets de listing completos
- checagem final de permissões efetivas no AAB (após build) para manter princípio de mínimo privilégio

Falta / bloquear antes de produção:
- política/termos sem status de minuta
- URL pública final de termos passageiro
- URL/página pública de exclusão de conta/dados

---

## 4) Bloqueadores

Antes de teste interno (internal/closed):
1. Definir estratégia segura de submit por app (profiles separados e package explícito por submissão).
2. Confirmar processo de build por variante sem risco de namespace/applicationId incorreto.
3. Organizar assets mínimos de listing por app.
4. Confirmar credencial play-store-key.json disponível apenas em ambiente seguro (não no repo).

Antes de produção pública:
1. Remover status de minuta dos documentos legais e publicar versões finais.
2. Publicar páginas públicas:
   - /privacidade
   - /termos-passageiro
   - /termos-motorista
   - /excluir-conta (ou página equivalente com instruções de exclusão de dados)
3. Garantir narrativa e evidência para background location (Motorista):
   - disclosure no app
   - uso restrito quando online/corrida
   - possibilidade clara de desligar (offline)
4. Revisar Data Safety no Console com matriz real de dados e terceiros.

---

## 5) Riscos de rejeição e mitigação

### Risco alto
1. Background location (Motorista)
- Motivo: política do Google é rigorosa para ACCESS_BACKGROUND_LOCATION.
- Mitigação: justificar no formulário, incluir disclosure in-app claro antes da permissão, provar necessidade funcional (motorista online e corrida ativa), limitar coleta ao contexto operacional.

2. Documentos legais em minuta
- Motivo: inconsistência entre app/listing e política pública pode gerar rejeição.
- Mitigação: publicar versões finais revisadas juridicamente.

3. Data deletion incompleto
- Motivo: Play exige instrução clara para exclusão de conta/dados.
- Mitigação: página pública de exclusão + fluxo operacional (mesmo que via e-mail inicialmente, com SLA e passos claros).

### Risco médio
4. Ambiguidade de submit para dois apps com profile único
- Motivo: risco de upload para app errado ou metadados inconsistentes.
- Mitigação: submit profiles separados por app e validação de package no artefato antes de submit.

5. Inconsistência de permissões declaradas x efetivas
- Motivo: Play pode comparar Data Safety com permissões detectadas no AAB.
- Mitigação: auditar permissões do AAB final com aapt e alinhar texto do formulário.

6. Promessas comerciais sensíveis
- Motivo: linguagem de “ganhos” no app motorista pode ser interpretada como promessa indevida se exagerada.
- Mitigação: manter linguagem factual, sem renda garantida, sem claims absolutos.

---

## 6) Data Safety (mapeamento prático para Console)

Dados coletados (resumo):
- Identificação: nome, telefone, e-mail
- Localização: aproximada e precisa
- Motorista: documentos pessoais e do veículo
- Operação: histórico de corridas, avaliações, status
- Notificações: tokens push (expo/fcm)
- Financeiro: dados de recarga/pagamento (integrações Asaas e SumUp), Pix do motorista

Terceiros/integradores evidentes:
- Google Maps / Places
- Firebase/FCM
- Expo (updates/notifications/runtime)
- SumUp
- Asaas
- Twilio (WhatsApp, comunicações)
- AWS (infraestrutura)

Finalidades:
- Funcionalidade principal do app
- Segurança e prevenção de fraude
- Pagamentos e repasses
- Comunicação operacional/suporte
- Diagnóstico operacional (quando aplicável)

Atenção de consistência:
- O que for marcado como coletado/compartilhado no Play Console precisa bater com política pública e com o comportamento real do app.

---

## 7) Listing Play Store (o que já existe x o que falta)

Já existe no repo:
- Guia de textos de listing: docs/frentes/play-store-listing.md
- Guia de screenshots/assets: docs/frentes/play-store-screenshots-guide.md
- Guia de data safety: docs/frentes/play-store-data-safety.md

Falta consolidar para publicação:
- Nome curto final por app no Console
- Descrição curta e longa final por app
- Ícone 512x512 final por app (arquivo de upload)
- Feature graphic 1024x500 por app
- Mínimo 2 screenshots por app (ideal 4-6)
- Categoria/tags/classificação etária no Console
- Declaração de anúncios
- Declarações de app de mobilidade e permissões sensíveis
- URLs públicas definitivas (privacidade, termos, exclusão)
- Contato público definitivo e consistente (email/telefone/site)

Observação: há divergência entre documentos internos sobre e-mail de contato (contato@kaviar.com.br em guia de listing vs suporte@kaviar.com.br informado para operação). Unificar antes da publicação.

---

## 8) Build e submit (comandos e observações)

Comandos de build AAB (corretos):
- npx --yes eas-cli@latest build --platform android --profile driver-release
- npx --yes eas-cli@latest build --platform android --profile passenger-release

Submit interno (comando base atual):
- npx --yes eas-cli@latest submit --platform android --profile production

Risco operacional atual:
- submit profile único pode causar ambiguidade para dois apps.

Recomendação:
- criar submit profiles separados (ex.: submit.driver-production e submit.passenger-production), cada um com referência explícita do app/package no fluxo de submit.

---

## 9) Arquivos que precisam de ajuste (não ajustados nesta auditoria)

Prioridade alta:
1. docs/politica-privacidade-kaviar-v1.md
2. docs/termos-uso-passageiro-kaviar-v1.md
3. docs/termos-uso-motorista-kaviar-v1.md
4. eas.json (separar submit profiles por app)
5. Conteúdo público no site (fora deste repo):
   - /privacidade
   - /termos-passageiro
   - /termos-motorista
   - /excluir-conta

Prioridade média:
6. Artefatos visuais de listing (ícone 512, feature graphic, screenshots) em pasta dedicada
7. Documento operacional final de Data Safety consolidado por app

---

## 10) Ordem recomendada de execução

Fase A — Pré-condições (sem build)
1. Finalizar jurídico (política e termos sem minuta).
2. Publicar páginas públicas no site (incluindo exclusão de conta/dados).
3. Consolidar matriz Data Safety final por app e validar consistência.
4. Ajustar estratégia de submit para dois apps (profiles separados).

Fase B — Publicação em teste interno/closed
1. Gerar AAB do Motorista (driver-release).
2. Validar package/versionCode/permissões no artefato.
3. Submeter Motorista no track internal.
4. Repetir para Passageiro.
5. Completar formulário de Data Safety e declarações sensíveis no Console.

Fase C — Evolução para produção
1. Rodar ciclo de closed testing com checklist funcional e de compliance.
2. Corrigir inconsistências de política/listing/data safety.
3. Publicar em produção escalonada.

---

## 11) Veredito final

- Kaviar Motorista: QUASE PRONTO para teste interno; BLOQUEADO para produção até fechar jurídico/data deletion/disclosure background.
- Kaviar Passageiro: QUASE PRONTO para teste interno; BLOQUEADO para produção até fechar jurídico/data deletion/listing final.
- Programa de publicação recomendado: publicar primeiro em internal/closed com governança de compliance e submit separado por app, depois promover para produção.
