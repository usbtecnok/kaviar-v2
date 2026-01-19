# ✅ Cron Job de Compliance - Preparado para Produção

**Data:** 2026-01-18T17:50:00-03:00  
**Status:** ✅ Pronto para instalação

---

## 📁 Arquivos Criados

### 1. Wrapper Node.js
**Arquivo:** `backend/scripts/compliance-cron.js`  
**Tamanho:** 3.2 KB  
**Função:** Executa `complianceService.applyAutomaticBlocks()`

**Características:**
- Logs detalhados com timestamps
- Tratamento de erros
- Exit codes apropriados (0 = sucesso, 1 = erro)
- Exibe motoristas bloqueados

### 2. Script Bash
**Arquivo:** `backend/scripts/run-compliance-cron.sh`  
**Tamanho:** 2.2 KB  
**Permissões:** Executável (755)

**Características:**
- Logs em arquivo diário
- Logs de erro separados
- Rotação automática (30 dias)
- Validações de ambiente

### 3. Entrada de Crontab
**Arquivo:** `backend/scripts/compliance-crontab.txt`  
**Conteúdo:**
```
0 0 * * * /home/goes/kaviar/backend/scripts/run-compliance-cron.sh
```

**Horário:** 00:00 UTC (diariamente)

### 4. Documentação
**Arquivo:** `backend/scripts/COMPLIANCE_CRON_README.md`  
**Tamanho:** 8.8 KB

**Conteúdo:**
- Guia de instalação
- Estrutura de logs
- Monitoramento
- Troubleshooting
- Configuração avançada

### 5. Script de Teste
**Arquivo:** `backend/scripts/test-compliance-cron.sh`  
**Tamanho:** 3.5 KB  
**Permissões:** Executável (755)

**Função:** Valida instalação antes de ativar

---

## 🚀 Instalação

### Passo 1: Testar Manualmente

```bash
cd /home/goes/kaviar/backend

# Executar teste de instalação
./scripts/test-compliance-cron.sh

# Executar uma vez manualmente
./scripts/run-compliance-cron.sh

# Verificar log
tail -f logs/compliance/compliance-cron-$(date +%Y%m%d).log
```

### Passo 2: Instalar no Crontab

```bash
# Editar crontab
crontab -e

# Adicionar linha:
0 0 * * * /home/goes/kaviar/backend/scripts/run-compliance-cron.sh

# Salvar e sair (Ctrl+X, Y, Enter)
```

### Passo 3: Verificar Instalação

```bash
# Listar crontab
crontab -l

# Verificar se linha foi adicionada
crontab -l | grep compliance
```

---

## 📊 Estrutura de Logs

```
backend/logs/compliance/
├── compliance-cron-20260118.log    # Log diário (criado automaticamente)
├── compliance-cron-20260119.log    # Log diário
├── compliance-cron-20260120.log    # Log diário
└── compliance-cron-error.log       # Erros acumulados
```

**Rotação:** Logs com mais de 30 dias são automaticamente removidos.

---

## 📋 Exemplo de Log

```
[2026-01-18T00:00:01-03:00] ═══════════════════════════════════════════════════════════
[2026-01-18T00:00:01-03:00] Iniciando cron job de compliance
[2026-01-18T00:00:01-03:00] ═══════════════════════════════════════════════════════════
[2026-01-18T00:00:01-03:00] Executando compliance-cron.js...

═══════════════════════════════════════════════════════════
[2026-01-18T00:00:02.123Z] Iniciando cron job de compliance
═══════════════════════════════════════════════════════════

✅ Cron job executado com sucesso
⏱️  Duração: 1234ms
📊 Motoristas bloqueados: 2

📋 Detalhes dos bloqueios:
  1. Driver: driver-123
     Documento: doc-456
     Vencido em: 2026-01-10T00:00:00Z
     Bloqueado em: 2026-01-18T00:00:02Z

═══════════════════════════════════════════════════════════
[2026-01-18T00:00:02.456Z] Cron job finalizado
═══════════════════════════════════════════════════════════

[2026-01-18T00:00:02-03:00] ✅ Cron job executado com sucesso
[2026-01-18T00:00:02-03:00] Cron job finalizado (exit code: 0)
```

---

## 🔍 Monitoramento

### Verificar Última Execução

```bash
# Ver último log
tail -100 backend/logs/compliance/compliance-cron-$(date +%Y%m%d).log

# Ver erros
tail -100 backend/logs/compliance/compliance-cron-error.log

# Contar motoristas bloqueados hoje
grep "Motoristas bloqueados:" backend/logs/compliance/compliance-cron-$(date +%Y%m%d).log
```

### Alertas Recomendados

- **🔴 Crítico:** Cron job não executou (verificar crontab)
- **🟡 Warning:** Mais de 10 motoristas bloqueados em um dia
- **🟢 Info:** Cron job executado com sucesso

---

## ⚙️ Configuração

### Lógica de Bloqueio

- **Grace Period:** 7 dias após vencimento
- **Bloqueio:** Dia 8+ após vencimento
- **Status:** `blocked_compliance`
- **Método:** `complianceService.applyAutomaticBlocks()`

### Horários Alternativos

```bash
# Executar às 03:00 UTC
0 3 * * * /home/goes/kaviar/backend/scripts/run-compliance-cron.sh

# Executar a cada 12 horas
0 */12 * * * /home/goes/kaviar/backend/scripts/run-compliance-cron.sh

# Executar às 00:00 e 12:00 UTC
0 0,12 * * * /home/goes/kaviar/backend/scripts/run-compliance-cron.sh
```

---

## 🛠️ Troubleshooting

### Cron não está executando

```bash
# Verificar se cron está rodando
systemctl status cron

# Verificar logs do sistema
grep CRON /var/log/syslog | tail -50

# Verificar crontab
crontab -l
```

### Erro de permissão

```bash
# Dar permissão de execução
chmod +x /home/goes/kaviar/backend/scripts/run-compliance-cron.sh

# Verificar owner
ls -la /home/goes/kaviar/backend/scripts/run-compliance-cron.sh
```

### Testar manualmente

```bash
# Executar script bash
cd /home/goes/kaviar/backend
./scripts/run-compliance-cron.sh

# Executar Node.js diretamente
node scripts/compliance-cron.js
```

---

## 🔒 Segurança

- ✅ Script executa com permissões do usuário do crontab
- ✅ Logs são criados no diretório do backend
- ✅ Rotação automática de logs (30 dias)
- ✅ Erros são registrados separadamente
- ✅ Exit codes apropriados (0 = sucesso, 1 = erro)
- ✅ Validações de ambiente antes de executar

---

## 📚 Documentação Completa

**Arquivo:** `backend/scripts/COMPLIANCE_CRON_README.md`

**Conteúdo:**
- Guia de instalação detalhado
- Estrutura de logs
- Formato do log
- Monitoramento
- Troubleshooting completo
- Configuração avançada
- Segurança

---

## ✅ Checklist de Instalação

- [ ] Arquivos criados e verificados
- [ ] Permissões de execução configuradas
- [ ] Teste manual executado com sucesso
- [ ] Logs verificados
- [ ] Crontab editado
- [ ] Entrada adicionada ao crontab
- [ ] Crontab verificado com `crontab -l`
- [ ] Aguardar primeira execução automática
- [ ] Verificar log após primeira execução

---

## 🎯 Status

**✅ CRON JOB PREPARADO PARA PRODUÇÃO**

Todos os arquivos criados e prontos para instalação.  
**Nenhuma execução automática foi configurada.**

Para ativar, siga os passos de instalação acima.

---

**Preparado em:** 2026-01-18T17:50:00-03:00  
**Localização:** `/home/goes/kaviar/backend/scripts/`  
**Documentação:** `COMPLIANCE_CRON_README.md`
