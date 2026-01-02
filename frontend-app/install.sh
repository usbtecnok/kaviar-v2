#!/bin/bash

echo "🚀 Instalando Frontend KAVIAR..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 18+ primeiro."
    exit 1
fi

# Verificar versão do Node
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versão 18+ necessária. Versão atual: $(node -v)"
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado. Criando exemplo..."
    cp .env.example .env 2>/dev/null || echo "VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here" > .env
fi

echo "✅ Instalação concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure sua chave do Google Maps no arquivo .env"
echo "2. Certifique-se que o backend está rodando na porta 8080"
echo "3. Execute: npm run dev"
echo ""
echo "🌐 O frontend estará disponível em: http://localhost:3000"
