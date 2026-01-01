#!/bin/bash

# =====================================================
# SCRIPT DE VALIDAÇÃO FINAL E ATIVAÇÃO DO KAVIAR
# =====================================================

echo "🚀 KAVIAR - VALIDAÇÃO FINAL E ATIVAÇÃO"
echo "======================================"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 16+ para continuar."
    exit 1
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale npm para continuar."
    exit 1
fi

# Verificar se arquivo .env existe
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado. Configure as variáveis de ambiente."
    exit 1
fi

# Verificar variáveis críticas
source .env
if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET não configurado no .env"
    exit 1
fi

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Configurações do Supabase não encontradas no .env"
    exit 1
fi

echo "✅ Pré-requisitos verificados"
echo ""

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Falha ao instalar dependências"
        exit 1
    fi
    echo "✅ Dependências instaladas"
    echo ""
fi

# Função para executar teste
run_test() {
    local test_name="$1"
    local test_file="$2"
    
    echo "🧪 Executando: $test_name"
    echo "----------------------------------------"
    
    node "$test_file"
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ $test_name: PASSOU"
    else
        echo "❌ $test_name: FALHOU"
        return $exit_code
    fi
    echo ""
}

# Menu principal
echo "Escolha uma opção:"
echo "1) Executar apenas teste final de congelamento"
echo "2) Executar apenas ativação do sistema"
echo "3) Executar teste + ativação (sequencial)"
echo "4) Sair"
echo ""

read -p "Digite sua escolha (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🧪 EXECUTANDO TESTE FINAL DE CONGELAMENTO"
        echo "========================================="
        
        # Verificar se servidor está rodando
        if ! curl -s http://localhost:3000/health > /dev/null; then
            echo "❌ Servidor não está rodando em localhost:3000"
            echo "   Execute 'npm run dev' em outro terminal primeiro"
            exit 1
        fi
        
        run_test "Teste Final de Congelamento" "tests/final-freeze-test.js"
        
        if [ $? -eq 0 ]; then
            echo "🎉 SISTEMA APROVADO NO TESTE FINAL!"
            echo "   O backend está pronto para produção."
        else
            echo "❌ SISTEMA REPROVADO NO TESTE FINAL!"
            echo "   Corrija os problemas antes de prosseguir."
            exit 1
        fi
        ;;
        
    2)
        echo ""
        echo "🚀 EXECUTANDO ATIVAÇÃO DO SISTEMA"
        echo "================================="
        
        run_test "Ativação do Kaviar" "scripts/activate-kaviar.js"
        
        if [ $? -eq 0 ]; then
            echo "🎉 SISTEMA ATIVADO COM SUCESSO!"
            echo "   O Kaviar está oficialmente operacional."
        else
            echo "❌ FALHA NA ATIVAÇÃO DO SISTEMA!"
            echo "   Verifique os logs e tente novamente."
            exit 1
        fi
        ;;
        
    3)
        echo ""
        echo "🔄 EXECUTANDO TESTE + ATIVAÇÃO SEQUENCIAL"
        echo "========================================"
        
        # Verificar se servidor está rodando
        if ! curl -s http://localhost:3000/health > /dev/null; then
            echo "❌ Servidor não está rodando em localhost:3000"
            echo "   Execute 'npm run dev' em outro terminal primeiro"
            exit 1
        fi
        
        # Executar teste primeiro
        run_test "Teste Final de Congelamento" "tests/final-freeze-test.js"
        
        if [ $? -ne 0 ]; then
            echo "❌ TESTE FALHOU - Ativação cancelada"
            exit 1
        fi
        
        echo "✅ Teste passou! Prosseguindo com ativação..."
        echo ""
        
        # Executar ativação
        run_test "Ativação do Kaviar" "scripts/activate-kaviar.js"
        
        if [ $? -eq 0 ]; then
            echo "🎉 PROCESSO COMPLETO FINALIZADO!"
            echo "================================"
            echo "✅ Sistema testado e validado"
            echo "✅ Sistema ativado e operacional"
            echo "🚀 O Kaviar está pronto para produção!"
        else
            echo "❌ FALHA NA ATIVAÇÃO!"
            echo "   Sistema testado mas não ativado."
            exit 1
        fi
        ;;
        
    4)
        echo "👋 Saindo..."
        exit 0
        ;;
        
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac

echo ""
echo "📋 PRÓXIMOS PASSOS RECOMENDADOS:"
echo "================================"
echo "1. Configure domínios CORS para produção"
echo "2. Configure certificado SSL/HTTPS"
echo "3. Configure monitoramento de logs"
echo "4. Execute backup inicial do banco"
echo "5. Configure alertas de segurança"
echo ""
echo "🎯 Sistema pronto para deploy em produção!"
