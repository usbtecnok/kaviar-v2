#!/bin/bash

# KAVIAR - Roteiro de Testes Completo
# Testa todos os fluxos de autenticação, cadastro, aprovação e avaliação

API_BASE="http://localhost:3003/api"
echo "🚀 KAVIAR - Teste Completo de Autenticação e Avaliação"
echo "=================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    local expected_status=${5:-200}
    
    echo -e "\n${BLUE}🧪 Testando: $description${NC}"
    echo "   $method $url"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_BASE$url" \
            -H "Content-Type: application/json" \
            ${ADMIN_TOKEN:+-H "Authorization: Bearer $ADMIN_TOKEN"})
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_BASE$url" \
            -H "Content-Type: application/json" \
            ${ADMIN_TOKEN:+-H "Authorization: Bearer $ADMIN_TOKEN"} \
            ${data:+-d "$data"})
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "   ${GREEN}✅ Status: $http_code${NC}"
        echo "   📄 Response: $(echo "$body" | jq -c '.' 2>/dev/null || echo "$body")"
        
        # Extrair tokens importantes
        if [[ "$body" == *"token"* ]]; then
            token=$(echo "$body" | jq -r '.token // .data.token // empty' 2>/dev/null)
            if [ "$token" != "null" ] && [ -n "$token" ]; then
                if [[ "$url" == *"admin"* ]]; then
                    ADMIN_TOKEN="$token"
                    echo -e "   🔑 ${YELLOW}Admin token salvo${NC}"
                elif [[ "$url" == *"passenger"* ]]; then
                    PASSENGER_TOKEN="$token"
                    echo -e "   🔑 ${YELLOW}Passenger token salvo${NC}"
                elif [[ "$url" == *"driver"* ]]; then
                    DRIVER_TOKEN="$token"
                    echo -e "   🔑 ${YELLOW}Driver token salvo${NC}"
                elif [[ "$url" == *"guide"* ]]; then
                    GUIDE_TOKEN="$token"
                    echo -e "   🔑 ${YELLOW}Guide token salvo${NC}"
                fi
            fi
        fi
        
        # Extrair IDs importantes
        if [[ "$body" == *"\"id\""* ]]; then
            id=$(echo "$body" | jq -r '.data.id // .id // empty' 2>/dev/null)
            if [ "$id" != "null" ] && [ -n "$id" ]; then
                if [[ "$description" == *"driver"* ]] || [[ "$description" == *"motorista"* ]]; then
                    DRIVER_ID="$id"
                    echo -e "   🆔 ${YELLOW}Driver ID: $id${NC}"
                elif [[ "$description" == *"guide"* ]] || [[ "$description" == *"guia"* ]]; then
                    GUIDE_ID="$id"
                    echo -e "   🆔 ${YELLOW}Guide ID: $id${NC}"
                elif [[ "$description" == *"passenger"* ]] || [[ "$description" == *"passageiro"* ]]; then
                    PASSENGER_ID="$id"
                    echo -e "   🆔 ${YELLOW}Passenger ID: $id${NC}"
                fi
            fi
        fi
        
        return 0
    else
        echo -e "   ${RED}❌ Status: $http_code (esperado: $expected_status)${NC}"
        echo "   📄 Response: $(echo "$body" | jq -c '.' 2>/dev/null || echo "$body")"
        return 1
    fi
}

echo -e "\n${YELLOW}📋 FASE 1: HEALTH CHECK${NC}"
test_endpoint "GET" "/health" "" "Health check"

echo -e "\n${YELLOW}📋 FASE 2: CADASTROS${NC}"

# Cadastro Passageiro
test_endpoint "POST" "/governance/passenger" '{
  "name": "João Passageiro",
  "email": "joao@test.com",
  "phone": "(21) 99999-1001",
  "password": "pass123456"
}' "Cadastro passageiro"

# Consentimento LGPD
if [ -n "$PASSENGER_ID" ]; then
    test_endpoint "POST" "/governance/consent" '{
      "passengerId": "'$PASSENGER_ID'",
      "consentType": "LGPD",
      "accepted": true,
      "ipAddress": "127.0.0.1"
    }' "Consentimento LGPD"
fi

# Cadastro Motorista
test_endpoint "POST" "/governance/driver" '{
  "name": "Carlos Motorista",
  "email": "carlos@test.com",
  "phone": "(21) 99999-1002",
  "password": "driver123456",
  "documentCpf": "123.456.789-00",
  "documentRg": "12.345.678-9",
  "documentCnh": "12345678901",
  "vehiclePlate": "ABC-1234",
  "vehicleModel": "Honda Civic 2020"
}' "Cadastro motorista"

# Cadastro Guia Turístico
test_endpoint "POST" "/governance/guide" '{
  "name": "Ana Guia",
  "email": "ana@test.com",
  "phone": "(21) 99999-1003",
  "password": "guide123456",
  "isBilingual": true,
  "languages": ["Português", "Inglês"],
  "alsoDriver": false
}' "Cadastro guia turístico"

echo -e "\n${YELLOW}📋 FASE 3: LOGIN ADMIN${NC}"

# Login Admin
test_endpoint "POST" "/admin/auth/login" '{
  "email": "admin@kaviar.com",
  "password": "admin123"
}' "Login admin"

echo -e "\n${YELLOW}📋 FASE 4: APROVAÇÕES ADMIN${NC}"

if [ -n "$ADMIN_TOKEN" ]; then
    # Listar motoristas pendentes
    test_endpoint "GET" "/admin/drivers?status=pending" "" "Listar motoristas pendentes"
    
    # Aprovar motorista
    if [ -n "$DRIVER_ID" ]; then
        test_endpoint "PUT" "/admin/drivers/$DRIVER_ID/approve" "" "Aprovar motorista"
    fi
    
    # Listar guias pendentes
    test_endpoint "GET" "/admin/guides?status=pending" "" "Listar guias pendentes"
    
    # Aprovar guia
    if [ -n "$GUIDE_ID" ]; then
        test_endpoint "PUT" "/admin/guides/$GUIDE_ID/approve" "" "Aprovar guia turístico"
    fi
else
    echo -e "${RED}❌ Pulando aprovações - Admin token não disponível${NC}"
fi

echo -e "\n${YELLOW}📋 FASE 5: LOGINS PÓS-APROVAÇÃO${NC}"

# Login Passageiro (deve funcionar se LGPD aceito)
test_endpoint "POST" "/auth/passenger/login" '{
  "email": "joao@test.com",
  "password": "pass123456"
}' "Login passageiro (com LGPD)"

# Login Passageiro SEM LGPD (deve falhar)
test_endpoint "POST" "/auth/passenger/login" '{
  "email": "passenger@test.com",
  "password": "pass123"
}' "Login passageiro (sem LGPD)" 401

# Login Motorista (deve funcionar se aprovado)
test_endpoint "POST" "/auth/driver/login" '{
  "email": "carlos@test.com",
  "password": "driver123456"
}' "Login motorista (aprovado)"

# Login Guia Turístico (deve funcionar se aprovado)
test_endpoint "POST" "/auth/guide/login" '{
  "email": "ana@test.com",
  "password": "guide123"
}' "Login guia turístico (aprovado)"

echo -e "\n${YELLOW}📋 FASE 6: SISTEMA DE AVALIAÇÃO${NC}"

# Criar avaliação de motorista
if [ -n "$PASSENGER_TOKEN" ] && [ -n "$DRIVER_ID" ]; then
    test_endpoint "POST" "/governance/ratings" '{
      "ratedId": "'$DRIVER_ID'",
      "raterId": "'$PASSENGER_ID'",
      "raterType": "PASSENGER",
      "score": 5,
      "comment": "Excelente motorista, muito educado e pontual!",
      "rideId": "ride-test-001"
    }' "Criar avaliação motorista"
    
    # Buscar estatísticas do motorista
    test_endpoint "GET" "/governance/ratings/driver/$DRIVER_ID" "" "Buscar estatísticas motorista"
else
    echo -e "${RED}❌ Pulando avaliações - Tokens não disponíveis${NC}"
fi

echo -e "\n${YELLOW}📋 FASE 7: TESTES DE VALIDAÇÃO${NC}"

# Tentar cadastro com email duplicado
test_endpoint "POST" "/governance/passenger" '{
  "name": "João Duplicado",
  "email": "joao@test.com",
  "phone": "(21) 99999-9999",
  "password": "pass123456"
}' "Cadastro duplicado (deve falhar)" 409

# Tentar login motorista não aprovado
test_endpoint "POST" "/auth/driver/login" '{
  "email": "driver@test.com",
  "password": "driver123"
}' "Login motorista não aprovado (deve falhar)" 401

# Tentar avaliação inválida (score fora do range)
if [ -n "$PASSENGER_TOKEN" ] && [ -n "$DRIVER_ID" ]; then
    test_endpoint "POST" "/governance/ratings" '{
      "ratedId": "'$DRIVER_ID'",
      "raterId": "'$PASSENGER_ID'",
      "raterType": "PASSENGER",
      "score": 10,
      "comment": "Score inválido"
    }' "Avaliação inválida (deve falhar)" 400
fi

echo -e "\n${GREEN}🎉 TESTE COMPLETO FINALIZADO!${NC}"
echo -e "\n${BLUE}📊 RESUMO DOS TOKENS:${NC}"
echo "Admin Token: ${ADMIN_TOKEN:-'❌ Não obtido'}"
echo "Passenger Token: ${PASSENGER_TOKEN:-'❌ Não obtido'}"
echo "Driver Token: ${DRIVER_TOKEN:-'❌ Não obtido'}"
echo "Guide Token: ${GUIDE_TOKEN:-'❌ Não obtido'}"

echo -e "\n${BLUE}📊 RESUMO DOS IDs:${NC}"
echo "Passenger ID: ${PASSENGER_ID:-'❌ Não obtido'}"
echo "Driver ID: ${DRIVER_ID:-'❌ Não obtido'}"
echo "Guide ID: ${GUIDE_ID:-'❌ Não obtido'}"

echo -e "\n${YELLOW}💡 PRÓXIMOS PASSOS:${NC}"
echo "1. Verificar se todos os endpoints retornaram status esperado"
echo "2. Testar no frontend as telas de login e cadastro"
echo "3. Testar aprovação admin no painel administrativo"
echo "4. Testar botão 'Avaliar Motorista' no frontend"
echo "5. Verificar guards de rota e persistência de sessão"
