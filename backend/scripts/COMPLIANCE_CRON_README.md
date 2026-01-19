# 📋 Cron Job de Compliance - Guia de Instalação

## Arquivos Criados

1. **`scripts/compliance-cron.js`** - Wrapper Node.js
2. **`scripts/run-compliance-cron.sh`** - Script bash com logs
3. **`scripts/compliance-crontab.txt`** - Entrada de crontab

---

## Instalação

### 1. Verificar Arquivos

```bash
cd /home/goes/kaviar/backend

# Verificar se arquivos existem
ls -la scripts/compliance-cron.js
ls -la scripts/run-compliance-cron.sh
ls -la scripts/compliance-crontab.txt

# Verificar permissões
chmod +x scripts/run-compliance-cron.sh
```

### 2. Testar Manualmente

```bash
# Executar uma vez para testar
./scripts/run-compliance-cron.sh

# Verificar log
tail -f logs/compliance/compliance-cron-$(date +%Y%m%d).log
```

### 3. Instalar no Crontab

```bash
# Editar crontab
crontab -e

# Adicionar linha (executar às 00:00 UTC diariamente):
0 0 * * * /home/goes/kaviar/backend/scripts/run-compliance-cron.sh

# Salvar e sair
```

### 4. Verificar Instalação

```bash
# Listar crontab atual
crontab -l

# Verificar logs do cron (sistema)
grep CRON /var/log/syslog | tail -20
```

---

## Estrutura de Logs

```
backend/logs/compliance/
├── compliance-cron-20260118.log    # Log diário
├── compliance-cron-20260119.log    # Log diário
├── compliance-cron-20260120.log    # Log diário
└── compliance-cron-error.log       # Erros acumulados
```

**Rotação:** Logs com mais de 30 dias são automaticamente removidos.

---

## Formato do Log

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
  2. Driver: driver-789
     Documento: doc-012
     Vencido em: 2026-01-08T00:00:00Z
     Bloqueado em: 2026-01-18T00:00:02Z

═══════════════════════════════════════════════════════════
[2026-01-18T00:00:02.456Z] Cron job finalizado
═══════════════════════════════════════════════════════════

[2026-01-18T00:00:02-03:00] ✅ Cron job executado com sucesso
[2026-01-18T00:00:02-03:00] ═══════════════════════════════════════════════════════════
[2026-01-18T00:00:02-03:00] Cron job finalizado (exit code: 0)
[2026-01-18T00:00:02-03:00] ═══════════════════════════════════════════════════════════
```

---

## Monitoramento

### Verificar Última Execução

```bash
# Ver último log
tail -100 backend/logs/compliance/compliance-cron-$(date +%Y%m%d).log

# Ver erros
tail -100 backend/logs/compliance/compliance-cron-error.log
```

### Verificar Motoristas Bloqueados

```bash
# Contar motoristas bloqueados hoje
grep "Motoristas bloqueados:" backend/logs/compliance/compliance-cron-$(date +%Y%m%d).log
```

### Alertas Recomendados

- **Crítico:** Cron job não executou (verificar crontab)
- **Warning:** Mais de 10 motoristas bloqueados em um dia
- **Info:** Cron job executado com sucesso

---

## Troubleshooting

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

### Erro de módulo não encontrado

```bash
# Verificar se backend está compilado
ls -la backend/dist/services/compliance.service.js

# Recompilar se necessário
cd backend
npm run build
```

### Testar manualmente

```bash
# Executar script diretamente
cd /home/goes/kaviar/backend
./scripts/run-compliance-cron.sh

# Executar Node.js diretamente
node scripts/compliance-cron.js
```

---

## Desinstalação

```bash
# Remover do crontab
crontab -e
# Deletar linha do compliance

# Remover logs (opcional)
rm -rf backend/logs/compliance/
```

---

## Configuração Avançada

### Alterar Horário

```bash
# Executar às 03:00 UTC
0 3 * * * /home/goes/kaviar/backend/scripts/run-compliance-cron.sh

# Executar a cada 12 horas
0 */12 * * * /home/goes/kaviar/backend/scripts/run-compliance-cron.sh
```

### Notificações por Email

```bash
# Adicionar MAILTO no crontab
MAILTO=admin@kaviar.com
0 0 * * * /home/goes/kaviar/backend/scripts/run-compliance-cron.sh
```

### Logs Personalizados

Editar `scripts/run-compliance-cron.sh`:

```bash
# Alterar diretório de logs
LOG_DIR="/var/log/kaviar/compliance"

# Alterar formato do log
LOG_FILE="${LOG_DIR}/compliance-$(date +%Y-%m-%d_%H-%M-%S).log"
```

---

## Segurança

- ✅ Script executa com permissões do usuário do crontab
- ✅ Logs são criados no diretório do backend
- ✅ Rotação automática de logs (30 dias)
- ✅ Erros são registrados separadamente
- ✅ Exit codes apropriados (0 = sucesso, 1 = erro)

---

## Suporte

**Arquivos:**
- Wrapper: `backend/scripts/compliance-cron.js`
- Script: `backend/scripts/run-compliance-cron.sh`
- Crontab: `backend/scripts/compliance-crontab.txt`
- Logs: `backend/logs/compliance/`

**Documentação:**
- Serviço: `backend/src/services/compliance.service.ts`
- Migration: `backend/prisma/migrations/20260117_driver_compliance_documents.sql`
