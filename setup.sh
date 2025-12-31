#!/bin/bash

echo "🚀 Setup Kaviar WhatsApp + Supabase Backend"
echo "==========================================="

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Instalar dependências
echo "📦 Instalando dependências (incluindo Supabase)..."
npm install

# Criar arquivo .env se não existir
if [ ! -f ".env" ]; then
    echo "⚙️ Criando arquivo .env..."
    cp .env.example .env
    echo ""
    echo "🔧 IMPORTANTE: Configure suas credenciais no arquivo .env:"
    echo "   - TWILIO_ACCOUNT_SID"
    echo "   - TWILIO_AUTH_TOKEN" 
    echo "   - TWILIO_WHATSAPP_NUMBER"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
fi

# Verificar se todas as dependências foram instaladas
if [ -d "node_modules" ]; then
    echo "✅ Dependências instaladas com sucesso!"
else
    echo "❌ Erro na instalação das dependências"
    exit 1
fi

echo ""
echo "🗄️ PRÓXIMO PASSO: Configure o banco de dados"
echo "1. Acesse: https://supabase.com/dashboard/project/xcxxcexdsbaxgmmnxkgc"
echo "2. Vá em SQL Editor"
echo "3. Execute o script: database/schema.sql"
echo ""
echo "🎉 Setup concluído!"
echo ""
echo "📋 Para executar:"
echo "1. Configure o arquivo .env"
echo "2. Execute o schema SQL no Supabase"
echo "3. Execute: npm run dev"
echo ""
echo "🔗 URLs importantes:"
echo "   - Servidor: http://localhost:3000"
echo "   - Webhook: http://localhost:3000/webhooks/twilio/whatsapp"
echo "   - Teste: http://localhost:3000/webhooks/twilio/test"
echo "   - Supabase: https://supabase.com/dashboard/project/xcxxcexdsbaxgmmnxkgc"
