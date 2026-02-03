# 📧 Configuração AWS SES - kaviar.com.br

**Data:** 2026-02-02 17:50 BRT  
**Status:** ⚠️ **AGUARDANDO CONFIGURAÇÃO DNS**

---

## 🔧 REGISTROS DNS NECESSÁRIOS

### 1. DKIM (Autenticação de Email)

Adicionar os seguintes registros CNAME no DNS do domínio `kaviar.com.br`:

```
Nome: tlemhsjmzycvgs6stao224xbnu5eeczh._domainkey.kaviar.com.br
Tipo: CNAME
Valor: tlemhsjmzycvgs6stao224xbnu5eeczh.dkim.amazonses.com

Nome: pb7bfue3x22fla36ic5eo7nvuv2uy4id._domainkey.kaviar.com.br
Tipo: CNAME
Valor: pb7bfue3x22fla36ic5eo7nvuv2uy4id.dkim.amazonses.com

Nome: 2uwxtsgqbab445rm2tuerot6tj7wqicu._domainkey.kaviar.com.br
Tipo: CNAME
Valor: 2uwxtsgqbab445rm2tuerot6tj7wqicu.dkim.amazonses.com
```

### 2. SPF (Sender Policy Framework)

Adicionar registro TXT no DNS:

```
Nome: kaviar.com.br
Tipo: TXT
Valor: "v=spf1 include:amazonses.com ~all"
```

### 3. DMARC (Domain-based Message Authentication)

Adicionar registro TXT no DNS:

```
Nome: _dmarc.kaviar.com.br
Tipo: TXT
Valor: "v=DMARC1; p=quarantine; rua=mailto:postmaster@kaviar.com.br; pct=100; adkim=s; aspf=s"
```

**Explicação:**
- `p=quarantine` - Emails não autenticados vão para spam
- `rua=mailto:postmaster@kaviar.com.br` - Relatórios de DMARC
- `pct=100` - Aplicar política a 100% dos emails
- `adkim=s` - DKIM strict mode
- `aspf=s` - SPF strict mode

---

## 📊 STATUS ATUAL

### SES Account
- ✅ Sending Enabled: true
- ⚠️ Production Access: false (SANDBOX MODE)
- ✅ Enforcement Status: HEALTHY
- 📊 Send Quota: 200 emails/24h, 1 email/sec

### Domain Identity
- ✅ Domain: kaviar.com.br
- ⚠️ Verified: false (aguardando DNS)
- ✅ DKIM Signing: enabled
- ⚠️ DKIM Status: NOT_STARTED (aguardando DNS)

---

## 🚀 PRÓXIMOS PASSOS

### 1. Configurar DNS (URGENTE)
- [ ] Adicionar 3 registros CNAME para DKIM
- [ ] Adicionar registro TXT para SPF
- [ ] Adicionar registro TXT para DMARC
- [ ] Aguardar propagação DNS (pode levar até 48h)

### 2. Verificar Domínio
```bash
aws sesv2 get-email-identity --email-identity kaviar.com.br --region us-east-1
```

Aguardar até `VerifiedForSendingStatus: true`

### 3. Sair do Sandbox
Após domínio verificado, solicitar saída do sandbox:
- Acessar: https://console.aws.amazon.com/ses/home?region=us-east-1#/account
- Clicar em "Request production access"
- Preencher formulário:
  - Use case: Transactional emails (password reset, notifications)
  - Website URL: https://kaviar.com.br
  - Expected volume: < 1000 emails/day
  - Bounce/complaint handling: Automated via SES suppression list

### 4. Configurar ECS Task Role
Adicionar permissão ao Task Role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "arn:aws:ses:us-east-1:847895361928:identity/kaviar.com.br"
    }
  ]
}
```

---

## 🧪 TESTAR CONFIGURAÇÃO

### Verificar DKIM
```bash
dig +short tlemhsjmzycvgs6stao224xbnu5eeczh._domainkey.kaviar.com.br CNAME
```

### Verificar SPF
```bash
dig +short kaviar.com.br TXT | grep spf
```

### Verificar DMARC
```bash
dig +short _dmarc.kaviar.com.br TXT
```

---

## 📝 NOTAS

- **Remetente padrão:** no-reply@kaviar.com.br
- **Sandbox:** Só pode enviar para emails verificados
- **Produção:** Pode enviar para qualquer email
- **Rate limit:** 1 email/sec (sandbox), aumenta em produção

---

**Status:** ⚠️ Aguardando configuração DNS para prosseguir
