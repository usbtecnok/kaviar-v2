#!/bin/bash
# ============================================================
# KAVIAR AWS CLEANUP - Aprovado em 2026-03-30
# Executar com usuário admin/root
# NÃO TOCA na produção (us-east-2 kaviar-backend-service)
# ============================================================
set -euo pipefail

echo "=========================================="
echo "KAVIAR AWS CLEANUP"
echo "=========================================="
echo ""

# ---- ETAPA 1: VPC Endpoints us-east-2 (~$22.50/mês) ----
echo "=== ETAPA 1: VPC Endpoints us-east-2 ==="
echo "ANTES:"
aws ec2 describe-vpc-endpoints --region us-east-2 \
  --vpc-endpoint-ids vpce-0c6b62320232ec92a vpce-09d8c0a3ae7067e74 vpce-0239f73d1cc992791 \
  --query 'VpcEndpoints[].{Id:VpcEndpointId,Service:ServiceName,State:State}' --output table

read -p "Deletar 3 VPC Endpoints? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  aws ec2 delete-vpc-endpoints --region us-east-2 \
    --vpc-endpoint-ids vpce-0c6b62320232ec92a vpce-09d8c0a3ae7067e74 vpce-0239f73d1cc992791
  echo "✅ VPC Endpoints deletados"
fi
echo ""

# ---- ETAPA 2: Lifecycle policy ECR us-east-2 (~$5/mês) ----
echo "=== ETAPA 2: ECR Lifecycle Policy us-east-2 ==="
echo "ANTES: $(aws ecr describe-images --region us-east-2 --repository-name kaviar-backend --query 'length(imageDetails)' --output text) imagens"

read -p "Criar lifecycle policy (manter 10 últimas)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  aws ecr put-lifecycle-policy --region us-east-2 --repository-name kaviar-backend \
    --lifecycle-policy-text '{"rules":[{"rulePriority":1,"description":"Keep last 10","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},"action":{"type":"expire"}}]}'
  echo "✅ Lifecycle policy criada"
  echo "DEPOIS: imagens serão limpas automaticamente em até 24h"
fi
echo ""

# ---- ETAPA 3: ECR repo legado us-east-1 (~$2.80/mês) ----
echo "=== ETAPA 3: ECR repo legado us-east-1 ==="
echo "ANTES: $(aws ecr describe-images --region us-east-1 --repository-name kaviar-backend --query 'length(imageDetails)' --output text) imagens (~28GB)"

read -p "Deletar repo ECR inteiro em us-east-1? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  aws ecr delete-repository --region us-east-1 --repository-name kaviar-backend --force
  echo "✅ ECR repo us-east-1 deletado"
fi
echo ""

# ---- ETAPA 4: EC2 parado + EBS us-east-2 (~$0.64/mês) ----
echo "=== ETAPA 4: EC2 parado us-east-2 ==="
echo "ANTES:"
aws ec2 describe-instances --region us-east-2 --instance-ids i-09c5e2c7262bb5ddb \
  --query 'Reservations[].Instances[].{Id:InstanceId,Name:Tags[?Key==`Name`]|[0].Value,State:State.Name,Type:InstanceType}' --output table

read -p "Terminar EC2 i-09c5e2c7262bb5ddb (Kaviar-EC2-Util-SSM, stopped)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  aws ec2 terminate-instances --region us-east-2 --instance-ids i-09c5e2c7262bb5ddb
  echo "✅ EC2 terminado (EBS será deletado automaticamente)"
fi
echo ""

# ---- VERIFICAÇÃO: Produção intacta ----
echo "=== VERIFICAÇÃO: Produção us-east-2 ==="
aws ecs describe-services --region us-east-2 --cluster kaviar-cluster --services kaviar-backend-service \
  --query 'services[].{Name:serviceName,Status:status,Running:runningCount}' --output table

echo ""
echo "=========================================="
echo "CLEANUP COMPLETO"
echo "=========================================="
