# CHECKLIST VALIDAÇÃO: FASE 1 - UPLOAD DE DOCUMENTOS

**Commit:** `5cc8ca1`  
**Data:** 2026-03-07  
**Objetivo:** Validar fluxo de upload de documentos do motorista

---

## PRÉ-REQUISITOS

### 1. Deploy Backend
```bash
cd /home/goes/kaviar
aws ecs update-service \
  --cluster kaviar-cluster \
  --service kaviar-backend-service \
  --force-new-deployment \
  --region us-east-2
```

**Aguardar:** ~2 minutos para nova task subir

**Validar healthcheck:**
```bash
curl https://api.kaviar.com.br/api/health | jq '.'
```

**Validar endpoint novo:**
```bash
# Obter token de motorista (usar um existente ou criar novo)
TOKEN="<driver_token>"

curl -s "https://api.kaviar.com.br/api/drivers/me/documents" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": []
}
```

---

### 2. Build App Motorista

```bash
cd /home/goes/kaviar
eas build --platform android --profile driver-apk
```

**Aguardar:** ~10-15 minutos

**Download APK:**
- Acessar link do EAS
- Baixar APK
- Instalar no dispositivo

---

## VALIDAÇÃO PONTA A PONTA

### CENÁRIO 1: Primeiro Acesso (Motorista Novo)

#### 1.1 Acessar Tela de Documentos
- [ ] Abrir app motorista
- [ ] Fazer login com motorista cadastrado
- [ ] Navegar para tela "Enviar Documentos" (se não estiver visível, adicionar botão na tela principal)
- [ ] Verificar que mostra "0/6 documentos enviados"
- [ ] Verificar que todos os 6 cards aparecem com status "Não enviado"

**Documentos esperados:**
- [ ] CPF
- [ ] RG
- [ ] CNH
- [ ] Comprovante de Residência
- [ ] Foto do Veículo
- [ ] Antecedentes Criminais

---

#### 1.2 Selecionar Documento (Foto)
- [ ] Tocar no card "CPF"
- [ ] Verificar que abre dialog com 2 opções: "Tirar Foto" e "Escolher Arquivo"
- [ ] Selecionar "Tirar Foto"
- [ ] Verificar que abre câmera
- [ ] Tirar foto de um documento
- [ ] Verificar que mostra preview da foto no card
- [ ] Verificar que status muda para "Selecionado" (azul)
- [ ] Verificar que ícone muda para 📸

---

#### 1.3 Selecionar Documento (Arquivo)
- [ ] Tocar no card "RG"
- [ ] Selecionar "Escolher Arquivo"
- [ ] Verificar que abre seletor de arquivos
- [ ] Escolher uma imagem ou PDF
- [ ] Verificar que mostra preview (se imagem) no card
- [ ] Verificar que status muda para "Selecionado"

---

#### 1.4 Validação de Tamanho
- [ ] Tocar no card "CNH"
- [ ] Selecionar "Escolher Arquivo"
- [ ] Escolher arquivo > 5MB
- [ ] Verificar que mostra erro: "O arquivo deve ter no máximo 5MB"
- [ ] Verificar que documento não é adicionado

---

#### 1.5 Enviar Documentos
- [ ] Selecionar pelo menos 2 documentos (CPF e RG)
- [ ] Verificar que botão "Enviar Documentos" aparece no rodapé
- [ ] Tocar no botão "Enviar Documentos"
- [ ] Verificar que mostra loading (spinner)
- [ ] Aguardar upload (pode demorar alguns segundos)
- [ ] Verificar que mostra alert "Sucesso: Documentos enviados para análise!"
- [ ] Verificar que status dos documentos muda para "Em análise" (amarelo)
- [ ] Verificar que ícone muda para ⏳
- [ ] Verificar que contador atualiza (ex: "2/6 documentos enviados")

---

#### 1.6 Recarregar Tela
- [ ] Fechar e reabrir o app
- [ ] Navegar para tela "Enviar Documentos"
- [ ] Verificar que documentos enviados aparecem com status "Em análise"
- [ ] Verificar que contador está correto

---

### CENÁRIO 2: Admin Aprova/Rejeita

#### 2.1 Admin Aprova Documento
- [ ] Acessar https://admin.kaviar.com.br
- [ ] Login: admin@kaviar.com / admin123
- [ ] Navegar para "Motoristas" → "Aprovação"
- [ ] Encontrar motorista que enviou documentos
- [ ] Abrir detalhes do motorista
- [ ] Verificar que documentos aparecem na lista
- [ ] Aprovar documento CPF
- [ ] Voltar ao app motorista
- [ ] Pull-to-refresh ou reabrir tela
- [ ] Verificar que CPF aparece com status "Aprovado" (verde)
- [ ] Verificar que ícone muda para ✅

---

#### 2.2 Admin Rejeita Documento
- [ ] No admin, rejeitar documento RG
- [ ] Motivo: "Foto borrada, envie novamente"
- [ ] Voltar ao app motorista
- [ ] Pull-to-refresh ou reabrir tela
- [ ] Verificar que RG aparece com status "Rejeitado" (vermelho)
- [ ] Verificar que ícone muda para ❌
- [ ] Verificar que mostra caixa vermelha com motivo: "Motivo: Foto borrada, envie novamente"

---

#### 2.3 Reenviar Documento Rejeitado
- [ ] Tocar no card "RG" (rejeitado)
- [ ] Verificar que abre dialog normalmente
- [ ] Tirar nova foto
- [ ] Verificar que preview atualiza
- [ ] Verificar que status muda para "Selecionado"
- [ ] Tocar em "Enviar Documentos"
- [ ] Verificar que upload funciona
- [ ] Verificar que status muda para "Em análise"
- [ ] Verificar que motivo de rejeição desaparece

---

#### 2.4 Documento Aprovado Não Pode Ser Alterado
- [ ] Tocar no card "CPF" (aprovado)
- [ ] Verificar que mostra alert: "Este documento já foi aprovado"
- [ ] Verificar que não abre seletor de arquivo

---

### CENÁRIO 3: Enviar Todos os 6 Documentos

#### 3.1 Completar Upload
- [ ] Selecionar os 4 documentos restantes (CNH, Comprovante, Veículo, Antecedentes)
- [ ] Enviar todos de uma vez
- [ ] Verificar que contador atualiza para "6/6 documentos enviados"
- [ ] Verificar que todos aparecem com status "Em análise"

---

#### 3.2 Admin Aprova Todos
- [ ] No admin, aprovar todos os 6 documentos
- [ ] Voltar ao app
- [ ] Verificar que todos aparecem com status "Aprovado"
- [ ] Verificar que contador mostra "6/6 documentos enviados"

---

#### 3.3 Validar Elegibilidade
- [ ] No admin, verificar que motorista agora é elegível para aprovação
- [ ] Aprovar motorista
- [ ] Verificar que status muda para "approved"

---

## VALIDAÇÃO TÉCNICA

### Backend

#### Endpoint GET /api/drivers/me/documents
```bash
TOKEN="<driver_token>"

curl -s "https://api.kaviar.com.br/api/drivers/me/documents" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Resultado esperado:**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc_...",
      "driver_id": "...",
      "type": "CPF",
      "file_url": "certidoes/...",
      "status": "SUBMITTED",
      "submitted_at": "2026-03-07T...",
      "created_at": "2026-03-07T...",
      "updated_at": "2026-03-07T..."
    }
  ]
}
```

---

#### Endpoint POST /api/drivers/me/documents
```bash
TOKEN="<driver_token>"

curl -X POST "https://api.kaviar.com.br/api/drivers/me/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "cpf=@/path/to/cpf.jpg" \
  -F "rg=@/path/to/rg.jpg"
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Documentos enviados com sucesso"
}
```

---

### Banco de Dados

```sql
-- Verificar documentos do motorista
SELECT 
  type,
  status,
  submitted_at,
  verified_at,
  rejected_at,
  reject_reason
FROM driver_documents
WHERE driver_id = '<driver_id>'
ORDER BY created_at DESC;
```

**Resultado esperado:**
- 6 registros (um para cada tipo)
- Status: SUBMITTED, VERIFIED, ou rejected
- Timestamps corretos

---

### S3

```bash
# Listar arquivos do motorista
aws s3 ls s3://kaviar-uploads-1769655575/certidoes/ --region us-east-2 | tail -10
```

**Resultado esperado:**
- Arquivos com timestamp recente
- Extensões: .jpg, .png, .pdf

---

## PROBLEMAS CONHECIDOS E SOLUÇÕES

### Problema 1: Tela de documentos não aparece no menu
**Solução:** Adicionar link/botão na tela principal do motorista para navegar para `/documents`

### Problema 2: Câmera não abre
**Solução:** Verificar permissões no AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

### Problema 3: Upload falha com erro 401
**Solução:** Verificar que token está sendo salvo corretamente no AsyncStorage após login

### Problema 4: Preview não aparece
**Solução:** Verificar que URI está correto e que Image component está renderizando

### Problema 5: Documentos não aparecem após recarregar
**Solução:** Verificar que endpoint GET está retornando dados e que mapeamento de tipos está correto

---

## MÉTRICAS DE SUCESSO

- [ ] Motorista consegue enviar os 6 documentos sem erros
- [ ] Upload completa em < 30 segundos (rede 4G)
- [ ] Status atualiza corretamente após aprovação/rejeição
- [ ] Reenvio após rejeição funciona
- [ ] Documentos aprovados não podem ser alterados
- [ ] Contador de progresso está correto
- [ ] Preview de imagens funciona
- [ ] Validação de tamanho funciona (5MB)
- [ ] Backend persiste corretamente em driver_documents
- [ ] Admin consegue ver e aprovar/rejeitar documentos

---

## PRÓXIMOS PASSOS (FASE 2)

Após validação completa da Fase 1:

1. **Melhorar feedback visual**
   - Pull-to-refresh para atualizar status
   - Notificação quando documento é aprovado/rejeitado

2. **Adicionar navegação**
   - Botão na tela principal do motorista
   - Deep link para tela de documentos

3. **Melhorar UX**
   - Compressão de imagens antes do upload
   - Retry automático em caso de falha
   - Progress bar durante upload

4. **Backend: Auditoria**
   - Tabela driver_document_history
   - Endpoint de histórico

---

**STATUS:** Pronto para validação  
**BLOQUEADORES:** Nenhum  
**DEPENDÊNCIAS:** Deploy backend + Build app
