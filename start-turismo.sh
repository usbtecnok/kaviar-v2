#!/bin/bash
# Quick Start - Rota /turismo

echo "🚀 Iniciando Kaviar - Rota /turismo"
echo ""

# Verificar se tmux está instalado
if ! command -v tmux &> /dev/null; then
    echo "⚠️  tmux não encontrado. Instalando..."
    sudo apt-get update && sudo apt-get install -y tmux
fi

# Criar sessão tmux
SESSION="kaviar-turismo"

# Matar sessão existente se houver
tmux kill-session -t $SESSION 2>/dev/null

# Criar nova sessão
tmux new-session -d -s $SESSION

# Janela 1: Backend
tmux rename-window -t $SESSION:0 'Backend'
tmux send-keys -t $SESSION:0 'cd /home/goes/kaviar/backend' C-m
tmux send-keys -t $SESSION:0 'echo "🔧 Iniciando Backend..."' C-m
tmux send-keys -t $SESSION:0 'npm run dev' C-m

# Janela 2: Frontend
tmux new-window -t $SESSION:1 -n 'Frontend'
tmux send-keys -t $SESSION:1 'cd /home/goes/kaviar/frontend-app' C-m
tmux send-keys -t $SESSION:1 'sleep 3' C-m
tmux send-keys -t $SESSION:1 'echo "🎨 Iniciando Frontend..."' C-m
tmux send-keys -t $SESSION:1 'npm run dev' C-m

# Janela 3: Logs/Testes
tmux new-window -t $SESSION:2 -n 'Testes'
tmux send-keys -t $SESSION:2 'cd /home/goes/kaviar' C-m
tmux send-keys -t $SESSION:2 'echo "⏳ Aguardando servidores iniciarem..."' C-m
tmux send-keys -t $SESSION:2 'sleep 10' C-m
tmux send-keys -t $SESSION:2 'echo ""' C-m
tmux send-keys -t $SESSION:2 'echo "✅ Servidores iniciados!"' C-m
tmux send-keys -t $SESSION:2 'echo ""' C-m
tmux send-keys -t $SESSION:2 'echo "📍 URLs:"' C-m
tmux send-keys -t $SESSION:2 'echo "   Backend:  http://localhost:3000"' C-m
tmux send-keys -t $SESSION:2 'echo "   Frontend: http://localhost:5173"' C-m
tmux send-keys -t $SESSION:2 'echo "   Turismo:  http://localhost:5173/turismo"' C-m
tmux send-keys -t $SESSION:2 'echo ""' C-m
tmux send-keys -t $SESSION:2 'echo "🧪 Executando testes..."' C-m
tmux send-keys -t $SESSION:2 './test-turismo.sh' C-m

# Selecionar janela de testes
tmux select-window -t $SESSION:2

echo ""
echo "✅ Servidores iniciando em background (tmux)"
echo ""
echo "📍 URLs:"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo "   Turismo:  http://localhost:5173/turismo"
echo ""
echo "🎮 Comandos tmux:"
echo "   tmux attach -t $SESSION    # Conectar à sessão"
echo "   Ctrl+B, 0                  # Ir para Backend"
echo "   Ctrl+B, 1                  # Ir para Frontend"
echo "   Ctrl+B, 2                  # Ir para Testes"
echo "   Ctrl+B, D                  # Desconectar (servidores continuam rodando)"
echo "   tmux kill-session -t $SESSION  # Parar tudo"
echo ""
echo "⏳ Aguarde ~10 segundos para os servidores iniciarem..."
echo ""

# Conectar à sessão
tmux attach -t $SESSION
