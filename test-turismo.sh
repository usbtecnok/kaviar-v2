#!/bin/bash
# Script de teste para a rota /turismo

echo "==================================="
echo "KAVIAR - Teste Rota /turismo"
echo "==================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuração
BACKEND_URL="http://localhost:3003"
FRONTEND_URL="http://localhost:5173"

echo -e "${YELLOW}1. Verificando se o backend está rodando...${NC}"
if curl -s "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend está rodando${NC}"
else
    echo -e "${RED}✗ Backend não está rodando${NC}"
    echo "Inicie o backend com: cd /home/goes/kaviar/backend && npm run dev"
    exit 1
fi

echo ""
echo -e "${YELLOW}2. Testando endpoint /api/turismo/chat...${NC}"

# Teste 1: Mensagem válida
echo -e "${YELLOW}   Teste 1: Mensagem válida${NC}"
RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/turismo/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Quais são os horários disponíveis?"}')

if echo "$RESPONSE" | grep -q "reply"; then
    echo -e "${GREEN}   ✓ Resposta recebida${NC}"
    echo "   Resposta: $(echo $RESPONSE | jq -r '.reply' 2>/dev/null || echo $RESPONSE)"
else
    echo -e "${RED}   ✗ Erro na resposta${NC}"
    echo "   $RESPONSE"
fi

echo ""
echo -e "${YELLOW}   Teste 2: Mensagem inválida (vazia)${NC}"
RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/turismo/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": ""}')

if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}   ✓ Validação funcionando${NC}"
else
    echo -e "${RED}   ✗ Validação não funcionou${NC}"
fi

echo ""
echo -e "${YELLOW}   Teste 3: Mensagem muito longa${NC}"
LONG_MSG=$(printf 'a%.0s' {1..501})
RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/turismo/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"$LONG_MSG\"}")

if echo "$RESPONSE" | grep -q "muito longa"; then
    echo -e "${GREEN}   ✓ Validação de tamanho funcionando${NC}"
else
    echo -e "${RED}   ✗ Validação de tamanho não funcionou${NC}"
fi

echo ""
echo -e "${YELLOW}3. Verificando variáveis de ambiente...${NC}"
cd /home/goes/kaviar/backend

if grep -q "FEATURE_TURISMO_AI=true" .env 2>/dev/null; then
    echo -e "${GREEN}✓ FEATURE_TURISMO_AI=true${NC}"
    
    if grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
        echo -e "${GREEN}✓ OPENAI_API_KEY configurada${NC}"
    else
        echo -e "${YELLOW}⚠ OPENAI_API_KEY não configurada (usando fallback)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ FEATURE_TURISMO_AI=false (usando fallback FAQ)${NC}"
fi

echo ""
echo -e "${YELLOW}4. Verificando assets do frontend...${NC}"
ASSETS_DIR="/home/goes/kaviar/frontend-app/public/turismo-replit"

if [ -d "$ASSETS_DIR" ]; then
    echo -e "${GREEN}✓ Diretório de assets existe${NC}"
    
    IMAGES=(
        "Gemini_Generated_Image_n3kx2kn3kx2kn3kx_1765055903753.png"
        "generated_images/luxury_sedan_in_rio_at_night.png"
        "generated_images/sugarloaf_mountain_golden_hour.png"
        "generated_images/tijuca_forest_road.png"
        "generated_images/christ_the_redeemer_majestic.png"
    )
    
    for img in "${IMAGES[@]}"; do
        if [ -f "$ASSETS_DIR/$img" ]; then
            echo -e "${GREEN}  ✓ $img${NC}"
        else
            echo -e "${RED}  ✗ $img (faltando)${NC}"
        fi
    done
else
    echo -e "${RED}✗ Diretório de assets não encontrado${NC}"
fi

echo ""
echo -e "${YELLOW}5. Verificando se o frontend está rodando...${NC}"
if curl -s "${FRONTEND_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend está rodando${NC}"
    echo -e "${GREEN}✓ Acesse: ${FRONTEND_URL}/turismo${NC}"
else
    echo -e "${YELLOW}⚠ Frontend não está rodando${NC}"
    echo "Inicie o frontend com: cd /home/goes/kaviar/frontend-app && npm run dev"
fi

echo ""
echo "==================================="
echo -e "${GREEN}Testes concluídos!${NC}"
echo "==================================="
echo ""
echo "📌 IMPORTANTE:"
echo "   Backend roda na porta 3003 (conforme .env.development)"
echo "   Frontend roda na porta 5173"
echo ""
echo "Próximos passos:"
echo "1. Acesse ${FRONTEND_URL}/turismo no navegador"
echo "2. Teste o chat flutuante"
echo "3. Clique nos botões WhatsApp"
echo "4. Verifique a responsividade (mobile/desktop)"
echo ""
echo "Para habilitar IA real:"
echo "1. Edite /home/goes/kaviar/backend/.env.development"
echo "2. Configure FEATURE_TURISMO_AI=true (já configurado)"
echo "3. Configure OPENAI_API_KEY=sk-proj-..."
echo "4. Reinicie o backend"
echo ""
