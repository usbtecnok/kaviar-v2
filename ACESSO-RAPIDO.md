# 🚀 KAVIAR - GUIA RÁPIDO DE ACESSO

## 📋 Ver Checklist de Produção

### Opção 1: Script interativo (recomendado)
```bash
cd /home/goes/kaviar && ./checklist.sh
```

### Opção 2: Ver direto
```bash
cd /home/goes/kaviar && cat PRODUCAO-CHECKLIST.md
```

### Opção 3: Editar e marcar itens
```bash
cd /home/goes/kaviar && nano PRODUCAO-CHECKLIST.md
# Trocar [ ] por [x] nos itens concluídos
# Ctrl+O para salvar, Ctrl+X para sair
```

---

## ⚡ Atalhos (Adicionar ao ~/.bashrc)

Adicione estas linhas ao seu `~/.bashrc`:

```bash
# Adicionar ao final do arquivo
source /home/goes/kaviar/.checklist-aliases
```

Depois rode:
```bash
source ~/.bashrc
```

Agora você pode usar:
- `checklist` - Ver checklist completo
- `check` - Ver checklist (versão curta)
- `check-edit` - Editar checklist
- `check-progress` - Ver quantos itens estão concluídos

---

## 📊 Ver Progresso

```bash
# Contar itens concluídos
grep -c '\[x\]' /home/goes/kaviar/PRODUCAO-CHECKLIST.md

# Contar itens pendentes
grep -c '\[ \]' /home/goes/kaviar/PRODUCAO-CHECKLIST.md

# Ver apenas bloqueantes pendentes
grep -A 1 '### [0-9]' /home/goes/kaviar/PRODUCAO-CHECKLIST.md | grep '\[ \]'
```

---

## 🔄 Atualizar Checklist

Se precisar adicionar novos itens ou modificar:

```bash
nano /home/goes/kaviar/PRODUCAO-CHECKLIST.md
```

---

## 📁 Estrutura de Arquivos

```
/home/goes/kaviar/
├── PRODUCAO-CHECKLIST.md      # Checklist principal
├── checklist.sh                # Script para visualizar
├── .checklist-aliases          # Atalhos bash
└── ACESSO-RAPIDO.md           # Este arquivo
```

---

## 💡 Dica

Sempre que iniciar o trabalho, rode:
```bash
cd /home/goes/kaviar && ./checklist.sh
```

Isso te mostra o que falta fazer e mantém o foco no que é crítico.
