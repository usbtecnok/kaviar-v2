# Central KAVIAR Pet — Operação Inicial

**Versão:** v1.0  
**Data:** Maio/2026  
**Status:** Pronto para execução  
**Pré-requisito para:** homologação de motoristas, corridas piloto

---

## 1. Função da Central KAVIAR Pet

A Central é o ponto único de controle da operação pet. Toda comunicação, validação e decisão passa por ela.

| Função | Descrição |
|--------|-----------|
| Atender motoristas interessados | Responder pré-cadastros, tirar dúvidas, iniciar homologação |
| Atender tutores | Orientar sobre o serviço, confirmar disponibilidade, resolver dúvidas |
| Enviar vídeos | Encaminhar links de treinamento ao motorista |
| Enviar questionário | Enviar link do Google Forms de certificação |
| Receber fotos | Receber e organizar fotos do veículo preparado |
| Validar kit | Analisar fotos: capa, kit higienização, banco traseiro |
| Acompanhar corrida piloto | Monitorar do embarque à finalização, estar disponível para dúvidas |
| Registrar incidente | Documentar qualquer ocorrência (sujeira, divergência, agressão) |
| Orientar motorista | Responder dúvidas operacionais durante corrida |
| Escalar para SUPER_ADMIN | Situações fora do protocolo, decisões financeiras, suspensão de selo |

---

## 2. Quem Pode Operar

### Fase piloto (agora)

- Operadora indicada manualmente pelo gestor
- Cadastrada/liberada pelo SUPER_ADMIN
- Acesso via WhatsApp + Google Forms + Google Sheets (sem sistema)
- Não precisa de login no admin dashboard nesta fase

### Fase futura (pós-piloto)

- Role `PET_OPERATOR` no sistema
- Acesso ao painel admin com aba KAVIAR Pet
- Gestão de motoristas, corridas e incidentes pelo dashboard
- Múltiplas operadoras com divisão por turno

### Critérios para operadora

- Conhecer o protocolo KAVIAR Pet (assistir vídeos + ler docs)
- Ter WhatsApp disponível no horário de operação
- Saber usar Google Sheets
- Comunicação clara e profissional
- Disponibilidade mínima: 8h/dia durante piloto

---

## 3. Ferramentas Iniciais

| Ferramenta | Uso | Status |
|------------|-----|--------|
| WhatsApp da Central | Comunicação com motoristas e tutores | A configurar |
| Google Forms — Pré-cadastro | Receber interessados | A criar |
| Google Forms — Questionário | Certificação (nota mínima 7/10) | A criar |
| Google Sheets — Central | Controle operacional (9 abas) | A criar |
| Pasta Google Drive — Fotos | Armazenar fotos de veículos | A criar |
| Links dos vídeos | Treinamento (Vídeo 1 + Vídeo 2) | A gravar |
| Landing `/pet` | Página pública de apresentação | ✅ Live (kaviar.com.br/pet) |

### Organização da pasta de fotos (Google Drive)

```
KAVIAR Pet — Fotos Homologação/
├── [Nome Motorista 1]/
│   ├── capa-protetora.jpg
│   ├── kit-higienizacao.jpg
│   └── banco-traseiro.jpg
├── [Nome Motorista 2]/
│   └── ...
└── _reprovados/
    └── ...
```

---

## 4. Rotina Diária da Central

### Manhã (início do turno)

| # | Ação | Tempo |
|---|------|-------|
| 1 | Abrir WhatsApp — verificar mensagens novas | 5 min |
| 2 | Abrir Google Sheets — conferir status pendentes | 3 min |
| 3 | Responder motoristas interessados (novos pré-cadastros) | 10 min |
| 4 | Enviar vídeos/questionário para quem está em andamento | 5 min |

### Ao longo do dia

| # | Ação | Quando |
|---|------|--------|
| 5 | Responder dúvidas de motoristas em treinamento | Conforme chegam |
| 6 | Receber e validar fotos | Conforme chegam |
| 7 | Conferir notas do questionário (Sheets vinculado) | Após notificação |
| 8 | Acompanhar corridas piloto em andamento | Durante corrida |
| 9 | Registrar incidentes (se houver) | Imediato |

### Final do dia

| # | Ação | Tempo |
|---|------|-------|
| 10 | Atualizar planilha — todos os status do dia | 10 min |
| 11 | Conferir pagamentos pendentes | 5 min |
| 12 | Anotar pendências para o dia seguinte | 3 min |
| 13 | Reportar resumo ao gestor (WhatsApp ou Sheets) | 5 min |

**Tempo estimado total:** 1-2h/dia durante piloto (2-3 motoristas)

---

## 5. Fluxo de Decisão

### Quando APROVAR

| Situação | Ação |
|----------|------|
| Questionário ≥ 7/10 | Aprovar questionário, seguir para fotos |
| Fotos OK (capa + kit + banco) | Aprovar kit, emitir selo |
| Veículo 4 portas + ar-condicionado | Aprovar veículo |

### Quando REPROVAR

| Situação | Ação |
|----------|------|
| Questionário < 7/10 (1ª vez) | Orientar reassistir vídeos, liberar em 24h |
| Questionário < 7/10 (2ª vez) | Orientar aguardar 7 dias, reassistir vídeos |
| Fotos insuficientes | Explicar o que falta, pedir reenvio |
| Veículo inadequado (2 portas, sem ar) | Informar requisitos, encerrar processo |
| Motorista não responde há 7 dias | Marcar como "Desistiu" |

### Quando PEDIR NOVA FOTO

| Situação | Mensagem |
|----------|----------|
| Capa com folgas/mal instalada | "A capa precisa cobrir todo o banco, sem folgas nas laterais" |
| Kit incompleto | "Não vi [item]. Envie nova foto com o kit completo" |
| Foto escura/desfocada | "Tire novamente com melhor iluminação" |
| Banco sujo | "O banco precisa estar limpo. Limpe e envie nova foto" |

### Quando CANCELAR CORRIDA

| Situação | Ação |
|----------|------|
| Divergência de porte/quantidade | Não iniciar, acionar Central para decisão |
| Animal agressivo sem focinheira | Não iniciar, registrar |
| Motorista sem capa instalada | Não iniciar, orientar |
| Tutor sem caixa para gato | Não iniciar, informar requisito |

### Quando ACIONAR SUPER_ADMIN

| Situação | Motivo |
|----------|--------|
| Incidente grave (mordida, acidente) | Decisão sobre suspensão/cobrança |
| Motorista contesta reprovação | Decisão final |
| Cobrança por dano ao veículo | Aprovação de valor |
| Dúvida sobre protocolo não coberto | Definição de regra |
| Suspensão ou revogação de selo | Autorização obrigatória |
| Tutor ameaça ou conflito grave | Gestão de crise |

---

## 6. Primeiro Dia de Operação

### Checklist de preparação (ANTES de contatar motoristas)

```
PREPARAÇÃO — CENTRAL KAVIAR PET

[ ] 1. WhatsApp da Central
    • Número dedicado configurado
    • Foto de perfil: logo KAVIAR Pet
    • Status: "Central KAVIAR Pet — Transporte especializado de pets"
    • Mensagens prontas salvas (respostas rápidas)

[ ] 2. Google Forms — Pré-cadastro
    • Formulário criado e publicado
    • Vinculado ao Sheets (aba Pré-cadastros)
    • Testado com envio de teste
    • Link curto gerado

[ ] 3. Google Forms — Questionário
    • Formulário criado em modo teste
    • 10 perguntas configuradas com gabarito
    • Nota mínima 70% configurada
    • Mensagens de aprovado/reprovado configuradas
    • Testado com envio de teste
    • Link curto gerado

[ ] 4. Google Sheets — Central
    • Arquivo criado com 9 abas
    • Colunas nomeadas em cada aba
    • Dropdowns de status configurados
    • Formatação condicional de cores aplicada
    • Forms vinculado à aba Pré-cadastros

[ ] 5. Pasta Google Drive — Fotos
    • Pasta criada: "KAVIAR Pet — Fotos Homologação"
    • Subpasta de teste criada
    • Permissão de acesso configurada

[ ] 6. Links dos vídeos
    • Vídeo 1 gravado e publicado (não listado)
    • Vídeo 2 gravado e publicado (não listado)
    • Links testados e funcionando

[ ] 7. Landing pública
    • https://kaviar.com.br/pet acessível
    • Conteúdo atualizado e correto

[ ] 8. Teste completo
    • Enviar mensagem teste no WhatsApp
    • Preencher formulário de pré-cadastro (teste)
    • Responder questionário (teste)
    • Verificar nota no Sheets
    • Enviar foto teste para pasta Drive
```

### Links necessários (preencher antes de iniciar)

| Item | Link |
|------|------|
| Landing | https://kaviar.com.br/pet |
| Forms pré-cadastro | [PREENCHER APÓS CRIAR] |
| Forms questionário | [PREENCHER APÓS CRIAR] |
| Sheets Central | [PREENCHER APÓS CRIAR] |
| Pasta fotos (Drive) | [PREENCHER APÓS CRIAR] |
| Vídeo 1 | [PREENCHER APÓS GRAVAR] |
| Vídeo 2 | [PREENCHER APÓS GRAVAR] |
| WhatsApp Central | [PREENCHER NÚMERO] |

---

## 7. Recomendação Prática — O Que Criar Primeiro

### Ordem de criação (prioridade)

| # | Item | Por quê | Tempo estimado |
|---|------|---------|:--------------:|
| 1 | WhatsApp da Central | Sem ele não há comunicação | 10 min |
| 2 | Google Sheets — Central | Base de controle de tudo | 30 min |
| 3 | Google Forms — Pré-cadastro | Primeiro ponto de entrada | 15 min |
| 4 | Pasta Google Drive — Fotos | Precisa existir antes de pedir fotos | 5 min |
| 5 | Google Forms — Questionário | Necessário após treinamento | 20 min |
| 6 | Vídeos de treinamento | Necessário antes do questionário | 2-4h (gravação) |

**Tempo total para montar a Central (sem vídeos):** ~1h20

### Ações imediatas (pode fazer agora)

1. **Definir número WhatsApp** — pode ser número pessoal da operadora com perfil comercial, ou WhatsApp Business dedicado
2. **Criar Google Sheets** — seguir modelo da seção 3 do kit operadora (`kaviar-pet-kit-operadora-piloto.md`)
3. **Criar Google Forms pré-cadastro** — seguir modelo da seção 1 do kit operadora
4. **Criar pasta no Drive** — "KAVIAR Pet — Fotos Homologação"
5. **Criar Google Forms questionário** — seguir modelo da seção 2 do kit operadora

### O que pode esperar

- Vídeos de treinamento → podem ser gravados em paralelo
- Corridas piloto → só após pelo menos 1 motorista homologado
- Integração com sistema → só após validar fluxo manual

### Mínimo viável para começar a homologar

```
✅ WhatsApp configurado
✅ Sheets criado (pelo menos abas 1, 2, 4, 5, 6)
✅ Forms pré-cadastro publicado
✅ Forms questionário publicado
✅ Pasta de fotos criada
✅ Vídeos gravados e com link
✅ Landing live (já está)
```

Quando esses 7 itens estiverem prontos, a Central pode começar a homologar o primeiro motorista.

---

*Central KAVIAR Pet — Operação Inicial v1.0 — Maio/2026*
