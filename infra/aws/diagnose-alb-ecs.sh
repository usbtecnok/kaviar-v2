#!/bin/bash
# Diagnóstico completo do problema ALB → ECS
set -euo pipefail

REGION="us-east-2"
CLUSTER="kaviar-cluster"
SERVICE="kaviar-backend-service"
TG_ARN="arn:aws:elasticloadbalancing:us-east-2:847895361928:targetgroup/kaviar-backend-tg/323fe3a4ccfef4cd"
SG_ALB="sg-081d62d61adf8d9eb"
SG_ECS="sg-0a54bc7272cae4623"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  DIAGNÓSTICO COMPLETO ALB → ECS                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Container Health
echo "1️⃣ Container Health Status:"
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER --service-name $SERVICE --region $REGION --query 'taskArns[0]' --output text)
aws ecs describe-tasks --cluster $CLUSTER --tasks $TASK_ARN --region $REGION --query 'tasks[0].containers[0].{Name:name,Status:lastStatus,Health:healthStatus}' --output table

# 2. Target Health
echo ""
echo "2️⃣ Target Group Health:"
aws elbv2 describe-target-health --target-group-arn $TG_ARN --region $REGION --query 'TargetHealthDescriptions[?TargetHealth.State!=`draining`].{IP:Target.Id,State:TargetHealth.State,Reason:TargetHealth.Reason,Description:TargetHealth.Description}' --output table

# 3. Security Groups
echo ""
echo "3️⃣ Security Group ECS (Ingress):"
aws ec2 describe-security-groups --group-ids $SG_ECS --region $REGION --query 'SecurityGroups[0].IpPermissions[*].{Protocol:IpProtocol,Port:FromPort,Source:UserIdGroupPairs[0].GroupId}' --output table

echo ""
echo "4️⃣ Security Group ALB (Egress):"
aws ec2 describe-security-groups --group-ids $SG_ALB --region $REGION --query 'SecurityGroups[0].IpPermissionsEgress[*].{Protocol:IpProtocol,FromPort:FromPort,ToPort:ToPort,Destination:IpRanges[0].CidrIp}' --output table

# 4. Task IPs vs Target IPs
echo ""
echo "5️⃣ Comparação IPs:"
echo "Tasks:"
aws ecs list-tasks --cluster $CLUSTER --service-name $SERVICE --region $REGION --output text | awk '{print $2}' | while read task; do
  aws ecs describe-tasks --cluster $CLUSTER --tasks $task --region $REGION --query 'tasks[0].attachments[0].details[?name==`privateIPv4Address`].value' --output text
done

echo "Targets:"
aws elbv2 describe-target-health --target-group-arn $TG_ARN --region $REGION --query 'TargetHealthDescriptions[*].Target.Id' --output text

# 5. Logs recentes
echo ""
echo "6️⃣ Logs Recentes (últimas 10 linhas):"
aws logs tail /ecs/kaviar-backend --since 2m --region $REGION 2>&1 | tail -10

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  FIM DO DIAGNÓSTICO                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
