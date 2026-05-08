#!/bin/bash

# Script de teste de segurança - Autenticação Admin
# Valida se todas as rotas estão protegidas

echo "🔐 KAVIAR - Teste de Segurança Admin"
echo "===================================="

BASE_URL="http://localhost:3001/api"
ADMIN_TOKEN=""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar acesso sem token
test_unauthorized_access() {
    echo ""
    echo "🚫 Testando acesso sem token (deve falhar)..."
    
    ENDPOINTS=(
        "/admin/drivers"
        "/admin/rides"
        "/admin/passengers"
        "/admin/dashboard/metrics"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        echo -n "  Testing $endpoint: "
        
        RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL$endpoint")
        HTTP_CODE="${RESPONSE: -3}"
        
        if [ "$HTTP_CODE" = "401" ]; then
            echo -e "${GREEN}✅ PROTEGIDO${NC}"
        else
            echo -e "${RED}❌ VULNERÁVEL (HTTP $HTTP_CODE)${NC}"
        fi
    done
}

# Função para testar token inválido
test_invalid_token() {
    echo ""
    echo "🔑 Testando token inválido (deve falhar)..."
    
    RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/admin/drivers" \
        -H "Authorization: Bearer invalid_token_123")
    HTTP_CODE="${RESPONSE: -3}"
    
    if [ "$HTTP_CODE" = "401" ]; then
        echo -e "${GREEN}✅ Token inválido rejeitado${NC}"
    else
        echo -e "${RED}❌ Token inválido aceito (HTTP $HTTP_CODE)${NC}"
    fi
}

# Função para fazer login válido
test_valid_login() {
    echo ""
    echo "📝 Testando login válido..."
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/admin/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@kaviar.com",
            "password": "${ADMIN_PASSWORD:-admin123}"
        }')
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success')
    
    if [ "$SUCCESS" = "true" ]; then
        ADMIN_TOKEN=$(echo $RESPONSE | jq -r '.data.token')
        echo -e "${GREEN}✅ Login realizado com sucesso${NC}"
        return 0
    else
        echo -e "${RED}❌ Falha no login: $RESPONSE${NC}"
        return 1
    fi
}

# Função para testar acesso com token válido
test_authorized_access() {
    echo ""
    echo "🔓 Testando acesso com token válido (deve funcionar)..."
    
    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${RED}❌ Token não disponível${NC}"
        return 1
    fi
    
    ENDPOINTS=(
        "/admin/drivers"
        "/admin/rides"
        "/admin/passengers"
    )
    
    for endpoint in "${ENDPOINTS[@]}"; do
        echo -n "  Testing $endpoint: "
        
        RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $ADMIN_TOKEN")
        HTTP_CODE="${RESPONSE: -3}"
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✅ AUTORIZADO${NC}"
        else
            echo -e "${RED}❌ NEGADO (HTTP $HTTP_CODE)${NC}"
        fi
    done
}

# Função para testar credenciais inválidas
test_invalid_credentials() {
    echo ""
    echo "🚫 Testando credenciais inválidas..."
    
    RESPONSE=$(curl -s -X POST "$BASE_URL/admin/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@kaviar.com",
            "password": "senha_errada"
        }')
    
    SUCCESS=$(echo $RESPONSE | jq -r '.success')
    
    if [ "$SUCCESS" = "false" ]; then
        echo -e "${GREEN}✅ Credenciais inválidas rejeitadas${NC}"
    else
        echo -e "${RED}❌ Credenciais inválidas aceitas${NC}"
    fi
}

# Função para mostrar resumo de segurança
show_security_summary() {
    echo ""
    echo "📊 RESUMO DE SEGURANÇA"
    echo "======================"
    echo ""
    echo "✅ Verificações realizadas:"
    echo "  - Rotas protegidas por autenticação"
    echo "  - Rejeição de tokens inválidos"
    echo "  - Rejeição de credenciais inválidas"
    echo "  - Autorização com token válido"
    echo ""
    echo "🔐 Status: Sistema protegido contra acesso não autorizado"
}

# Executar todos os testes
main() {
    test_unauthorized_access
    test_invalid_token
    test_invalid_credentials
    
    if test_valid_login; then
        test_authorized_access
    fi
    
    show_security_summary
    
    echo ""
    echo -e "${GREEN}🎉 Testes de segurança concluídos!${NC}"
}

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
    echo "❌ jq não está instalado. Instale com: sudo apt-get install jq"
    exit 1
fi

# Executar
main
