#!/bin/bash
# KAVIAR - Script de Subida em Produção
# Uso: ./subida-producao.sh [up|down|status|health|logs]

set -e

CLUSTER="kaviar-cluster"
SERVICE="kaviar-backend-service"
REGION="us-east-2"
API_URL="https://api.kaviar.com.br/api"
LOG_GROUP="/ecs/kaviar-backend"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI não encontrado. Instale com: sudo apt install awscli"
        exit 1
    fi
}

function ecs_status() {
    print_header "STATUS DO ECS SERVICE"
    aws ecs describe-services \
        --cluster $CLUSTER \
        --services $SERVICE \
        --region $REGION \
        --query 'services[0].{desiredCount:desiredCount,runningCount:runningCount,pendingCount:pendingCount,status:status}' \
        --output table
}

function ecs_up() {
    print_header "LIGANDO ECS SERVICE (desiredCount=1)"
    
    aws ecs update-service \
        --cluster $CLUSTER \
        --service $SERVICE \
        --desired-count 1 \
        --region $REGION \
        --query 'service.{serviceName:serviceName,desiredCount:desiredCount}' \
        --output table
    
    print_success "Service atualizado para desiredCount=1"
    print_warning "Aguardando task subir (30-60s)..."
    
    sleep 10
    
    for i in {1..12}; do
        RUNNING=$(aws ecs describe-services \
            --cluster $CLUSTER \
            --services $SERVICE \
            --region $REGION \
            --query 'services[0].runningCount' \
            --output text)
        
        if [ "$RUNNING" == "1" ]; then
            print_success "Task rodando!"
            break
        fi
        
        echo "Aguardando... ($i/12)"
        sleep 5
    done
    
    ecs_status
}

function ecs_down() {
    print_header "DESLIGANDO ECS SERVICE (desiredCount=0)"
    
    aws ecs update-service \
        --cluster $CLUSTER \
        --service $SERVICE \
        --desired-count 0 \
        --region $REGION \
        --query 'service.{serviceName:serviceName,desiredCount:desiredCount}' \
        --output table
    
    print_success "Service atualizado para desiredCount=0"
    print_warning "Aguardando task parar..."
    
    sleep 10
    ecs_status
}

function check_health() {
    print_header "TESTANDO HEALTH ENDPOINT"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
    
    if [ "$HTTP_CODE" == "200" ]; then
        print_success "Health OK (200)"
        echo ""
        echo "Resposta completa:"
        curl -s $API_URL/health | jq .
    else
        print_error "Health falhou (HTTP $HTTP_CODE)"
        echo ""
        echo "Tentando sem /api:"
        curl -i https://api.kaviar.com.br/health
    fi
}

function tail_logs() {
    print_header "LOGS DO CLOUDWATCH (últimos 5 minutos)"
    print_warning "Pressione Ctrl+C para sair"
    echo ""
    
    aws logs tail $LOG_GROUP \
        --region $REGION \
        --since 5m \
        --follow
}

function check_errors() {
    print_header "VERIFICANDO ERROS NOS LOGS (últimos 10 minutos)"
    
    aws logs filter-log-events \
        --log-group-name $LOG_GROUP \
        --region $REGION \
        --start-time $(date -u -d '10 minutes ago' +%s)000 \
        --filter-pattern "ERROR" \
        --query 'events[*].message' \
        --output text
    
    if [ $? -eq 0 ]; then
        print_success "Nenhum erro encontrado"
    fi
}

function full_validation() {
    print_header "VALIDAÇÃO COMPLETA"
    
    echo "1. Status do ECS:"
    ecs_status
    echo ""
    
    echo "2. Health Check:"
    check_health
    echo ""
    
    echo "3. Erros recentes:"
    check_errors
    echo ""
    
    print_success "Validação concluída"
}

# Main
check_aws_cli

case "$1" in
    up)
        ecs_up
        echo ""
        print_warning "Aguarde 20s e execute: ./subida-producao.sh health"
        ;;
    down)
        ecs_down
        ;;
    status)
        ecs_status
        ;;
    health)
        check_health
        ;;
    logs)
        tail_logs
        ;;
    errors)
        check_errors
        ;;
    validate)
        full_validation
        ;;
    *)
        echo "Uso: $0 {up|down|status|health|logs|errors|validate}"
        echo ""
        echo "Comandos:"
        echo "  up       - Liga o ECS service (desiredCount=1)"
        echo "  down     - Desliga o ECS service (desiredCount=0)"
        echo "  status   - Mostra status atual do service"
        echo "  health   - Testa endpoint de health"
        echo "  logs     - Mostra logs em tempo real"
        echo "  errors   - Busca erros nos últimos 10 minutos"
        echo "  validate - Validação completa (status + health + errors)"
        exit 1
        ;;
esac
