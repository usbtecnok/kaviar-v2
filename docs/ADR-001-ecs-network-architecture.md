# 🏗️ ADR: Arquitetura de Rede ECS - KAVIAR

**Status:** Aceito (Temporário)  
**Data:** 2026-01-31  
**Decisão:** Manter ECS em subnets públicas durante MVP/testes internos

---

## Contexto

O KAVIAR API está rodando em ECS Fargate com a seguinte configuração de rede:

- **VPC:** vpc-00ba3041932d79c51
- **Subnets:** 3 subnets públicas (MapPublicIpOnLaunch=True)
  - subnet-0fe824cc5abfd5432
  - subnet-08b77c12966dc4554
  - subnet-049a79c35ac5bf0bb
- **ECS Service:** assignPublicIp=ENABLED
- **ALB:** Público (correto)

## Situação Atual de Segurança ✅

### Security Groups (VALIDADO 2026-01-31)

**ECS Security Group (sg-03115257d1c6fc08c):**
- ✅ **INBOUND:** Porta 3001 SOMENTE do ALB (sg-0505c9dee417fc20a)
- ✅ **SEM acesso público direto** (0.0.0.0/0 não permitido)
- ✅ **EGRESS:** Permite saída para internet (necessário para RDS, Secrets Manager, S3)

**ALB Security Group (sg-0505c9dee417fc20a):**
- ✅ **INBOUND:** Portas 80/443 abertas para internet (correto para ALB público)

### Conclusão de Segurança

**Mesmo com ECS em subnets públicas + assignPublicIp=ENABLED, o sistema está seguro porque:**
1. Security Group do ECS bloqueia qualquer acesso direto da internet
2. Apenas o ALB pode se comunicar com o ECS na porta 3001
3. Tráfego público → ALB → ECS (caminho correto)

## Decisão

**Manter configuração atual durante fase MVP/testes internos** porque:

1. ✅ Security Groups estão corretamente configurados (validado)
2. ✅ Sistema funcionando e health check OK
3. ✅ Login admin funcionando
4. ✅ Não há risco de acesso direto ao ECS
5. ⏱️ Migração para subnets privadas requer planejamento (NAT Gateway, custos, testes)

## Consequências

### Positivas
- Sistema seguro via Security Groups
- Simplicidade operacional (sem NAT Gateway)
- Custo reduzido (NAT Gateway ~$32/mês + tráfego)
- Facilita debugging (tasks podem acessar internet diretamente)

### Negativas
- Não segue best practice AWS (ECS deveria estar em subnet privada)
- Superfície de ataque ligeiramente maior (mesmo que bloqueada por SG)
- Dependência de Security Groups para segurança (sem isolamento de rede)

## Plano de Migração (Próxima Entrega)

**Quando executar:** Antes de abrir para usuários reais / escalar produção

### Passos

1. **Criar Subnets Privadas**
   ```bash
   # Criar 3 subnets privadas (1 por AZ)
   # CIDR: 10.0.128.0/20, 10.0.144.0/20, 10.0.160.0/20
   ```

2. **Criar NAT Gateway**
   ```bash
   # Criar NAT Gateway em subnet pública
   # Associar Elastic IP
   # Custo estimado: $32/mês + $0.045/GB tráfego
   ```

3. **Criar Route Table Privada**
   ```bash
   # Route: 0.0.0.0/0 → NAT Gateway
   # Associar às subnets privadas
   ```

4. **Atualizar ECS Service**
   ```bash
   aws ecs update-service \
     --cluster kaviar-prod \
     --service kaviar-backend-service \
     --network-configuration '{
       "awsvpcConfiguration": {
         "subnets": ["subnet-private-1", "subnet-private-2", "subnet-private-3"],
         "securityGroups": ["sg-03115257d1c6fc08c"],
         "assignPublicIp": "DISABLED"
       }
     }' \
     --region us-east-1
   ```

5. **Validar**
   - Target Group HEALTHY
   - GET /api/health retorna 200
   - Login admin funcionando
   - Logs no CloudWatch

### Alternativa: VPC Endpoints (Mais Complexo)

Em vez de NAT Gateway, usar VPC Endpoints para:
- S3 (Gateway Endpoint - grátis)
- Secrets Manager (Interface Endpoint - $7.20/mês)
- ECR (Interface Endpoint - $7.20/mês)
- CloudWatch Logs (Interface Endpoint - $7.20/mês)

**Custo:** ~$21.60/mês vs $32/mês do NAT Gateway  
**Complexidade:** Maior (múltiplos endpoints, DNS privado)

## Monitoramento

- [ ] Revisar esta decisão antes de lançamento público
- [ ] Documentar custos de NAT Gateway vs VPC Endpoints
- [ ] Testar migração em ambiente de staging primeiro

## Referências

- [AWS ECS Best Practices - Networking](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/networking.html)
- [VPC Endpoints vs NAT Gateway](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)
- Security Group validation: 2026-01-31 (logs disponíveis)

---

**Última atualização:** 2026-01-31  
**Próxima revisão:** Antes de lançamento público
