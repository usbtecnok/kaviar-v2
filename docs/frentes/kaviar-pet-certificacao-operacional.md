# KAVIAR Pet — Certificação Operacional

> Documento oficial do fluxo de teste, certificação e manutenção do selo KAVIAR Pet para motoristas parceiros.

---

## 1. Fluxo Oficial de Certificação

### 1.1 Etapas

```
Treinamento → Questionário → Aprovação → Envio de Fotos → Validação Central → Selo Ativo → Renovação
```

| # | Etapa | Responsável | Prazo |
|---|-------|-------------|-------|
| 1 | Assistir Vídeo 1 (Segurança e Condução) | Motorista | Livre |
| 2 | Assistir Vídeo 2 (Protocolo e Atendimento) | Motorista | Livre |
| 3 | Responder questionário (nota mín. 7/10) | Motorista | Até 48h após vídeos |
| 4 | Aprovação automática (≥7) ou revisão manual (<7) | Sistema/Central | Imediato |
| 5 | Envio de fotos do veículo preparado | Motorista | Até 72h após aprovação |
| 6 | Validação visual pela Central | Operador | Até 24h úteis |
| 7 | Selo ativo — motorista habilitado para corridas pet | Sistema | Imediato |
| 8 | Renovação periódica | Motorista + Central | A cada 6 meses |

### 1.2 Requisitos para Aprovação no Questionário

- Nota mínima: **7/10** (70%)
- Tentativas: até **3 tentativas** por ciclo
- Intervalo entre tentativas: **24 horas**
- Após 3 reprovações: bloqueio de 7 dias + revisão obrigatória dos vídeos

### 1.3 Fotos Obrigatórias

| Foto | Descrição | Critério |
|------|-----------|----------|
| 1 | Capa protetora instalada no banco traseiro | Cobertura total, sem folgas |
| 2 | Cinto pet disponível | Visível e funcional |
| 3 | Kit de higienização (desinfetante + pano) | Acessível no veículo |
| 4 | Banco traseiro limpo e sem objetos soltos | Ambiente preparado |

---

## 2. Modelo de Certificado

### 2.1 Dados do Certificado

| Campo | Exemplo |
|-------|---------|
| Nome completo | João Carlos da Silva |
| ID Motorista | KAV-2024-00847 |
| Data de emissão | 2024-03-15 |
| Validade | 2024-09-15 (6 meses) |
| Nível | Certificado KAVIAR Pet — Nível 1 |
| QR Code | Link para verificação pública |
| Assinatura digital | Hash SHA-256 do certificado |

### 2.2 Texto Oficial

```
CERTIFICADO DE HABILITAÇÃO — KAVIAR PET

Certificamos que [NOME COMPLETO], ID [ID_MOTORISTA],
concluiu com aproveitamento o Treinamento Obrigatório
KAVIAR Pet — Segurança e Condução de Animais de Estimação,
estando habilitado(a) a realizar corridas pet na plataforma KAVIAR.

Emissão: [DATA_EMISSAO]
Validade: [DATA_VALIDADE]
Verificação: [URL_QR]

KAVIAR — Mobilidade Urbana Comunitária
```

### 2.3 Selo Visual

- Formato: badge circular dourado
- Elementos: ícone de pata + escudo + texto "CERTIFICADO"
- Exibição: perfil do motorista no app + card de corrida pet
- Arquivo de referência: `assets/kaviar-pet/selo-motorista-certificado.svg`

---

## 3. Regras de Certificação

### 3.1 Validade

| Regra | Valor |
|-------|-------|
| Validade padrão | 6 meses |
| Renovação antecipada | Permitida a partir de 30 dias antes do vencimento |
| Período de graça | 7 dias após vencimento (selo inativo, sem corridas pet) |

### 3.2 Suspensão

| Motivo | Ação | Duração |
|--------|------|---------|
| Reclamação grave de tutor | Suspensão imediata + investigação | Até resolução |
| Foto de veículo inadequado (auditoria) | Suspensão + reenvio de fotos | Até validação |
| Incidente com animal | Suspensão imediata | Mín. 30 dias + retreinamento |
| Não renovação no prazo | Inativação automática | Até renovação |

### 3.3 Renovação

- Questionário simplificado (5 perguntas, nota mín. 4/5)
- Nova foto do veículo preparado (1 foto geral)
- Sem necessidade de reassistir vídeos completos (exceto se houve atualização de protocolo)

### 3.4 Reincidência

| Ocorrência | Consequência |
|------------|--------------|
| 1ª suspensão | Retreinamento + questionário completo |
| 2ª suspensão (12 meses) | Bloqueio de 90 dias + retreinamento presencial |
| 3ª suspensão (12 meses) | Desabilitação permanente do módulo pet |

### 3.5 Perda do Selo

O selo é **revogado permanentemente** em caso de:

- Maus-tratos comprovados
- Abandono de animal durante corrida
- Falsificação de fotos/documentos
- Reincidência grave (3ª suspensão)

Motorista pode recorrer em até 15 dias via Central.

---

## 4. Estrutura Operacional da Central

### 4.1 Papéis

| Papel | Responsabilidade | Role no sistema |
|-------|-----------------|-----------------|
| Operador Pet | Valida fotos, aprova certificações, responde dúvidas | `OPERATOR` |
| Supervisor Pet | Revisa suspensões, decide recursos, audita | `SUPER_ADMIN` |
| Sistema | Aprovação automática de questionários, emissão de selo, alertas de vencimento | Automático |

### 4.2 Fluxo de Aprovação

```
Motorista envia fotos
    → Sistema notifica Operador Pet
    → Operador valida em até 24h úteis
        → Aprovado: selo ativado automaticamente
        → Reprovado: feedback + nova tentativa permitida
```

### 4.3 Registro de Incidentes

| Campo | Obrigatório |
|-------|-------------|
| ID Motorista | ✓ |
| ID Corrida | ✓ |
| Data/hora | ✓ |
| Tipo de incidente | ✓ (lista padronizada) |
| Descrição | ✓ |
| Evidências (fotos/prints) | Quando disponível |
| Ação tomada | ✓ |
| Responsável pela decisão | ✓ |

**Tipos de incidente padronizados:**
- Animal solto durante corrida
- Veículo sem capa/cinto
- Reclamação de tutor (leve/grave)
- Acidente envolvendo animal
- Higienização não realizada
- Comportamento inadequado do motorista

### 4.4 Auditoria Mínima

| Frequência | Ação |
|------------|------|
| Semanal | Revisar certificações pendentes há >24h |
| Mensal | Amostragem de 10% dos motoristas certificados (foto aleatória solicitada) |
| Trimestral | Relatório de incidentes + taxa de renovação |
| Semestral | Revisão do protocolo de treinamento |

### 4.5 SLAs

| Processo | SLA |
|----------|-----|
| Validação de fotos | 24h úteis |
| Resposta a recurso | 72h úteis |
| Investigação de incidente grave | 48h úteis |
| Emissão de selo (após aprovação) | Imediato (automático) |

---

## 5. Integração com o Sistema

### 5.1 Feature Flags

| Flag | Descrição |
|------|-----------|
| `pet_certification_enabled` | Habilita módulo de certificação |
| `pet_certification_auto_approve` | Aprovação automática de questionário (≥7) |
| `pet_certification_photo_required` | Exige fotos para ativação do selo |

### 5.2 Endpoints Relacionados (futuro)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/pet/certification/start` | POST | Inicia fluxo de certificação |
| `/api/pet/certification/quiz` | POST | Submete respostas do questionário |
| `/api/pet/certification/photos` | POST | Upload de fotos do veículo |
| `/api/pet/certification/status` | GET | Status atual da certificação |
| `/api/pet/certification/revoke` | POST | Revoga certificação (admin) |

---

## Histórico

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-05-26 | 1.0 | Documento inicial — fluxo, modelo, regras e estrutura operacional |
