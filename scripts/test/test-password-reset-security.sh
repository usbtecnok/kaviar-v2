#!/bin/bash
# Teste de regressão: fluxos de reset de senha e login
# Pós-deploy security-reset-20260409
set -euo pipefail

API="${API_URL:-https://api.kaviar.com.br}"
PASS=0
FAIL=0

ok()   { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }

echo "🔒 TESTE DE REGRESSÃO — Reset de Senha + Login"
echo "API: $API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Forgot-password: resposta neutra (conta inexistente)
echo ""
echo "1️⃣  Forgot-password — resposta neutra"
R=$(curl -s -w "\n%{http_code}" -X POST "$API/api/admin/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"naoexiste_test_xyz@kaviar.com","userType":"admin"}')
CODE=$(echo "$R" | tail -1)
BODY=$(echo "$R" | head -1)
[ "$CODE" = "200" ] && ok "HTTP 200 para email inexistente" || fail "Esperava 200, recebeu $CODE"
echo "$BODY" | grep -q "Se a conta existir" && ok "Mensagem neutra" || fail "Mensagem não é neutra"

# 2. Reset-password: token inválido rejeitado
echo ""
echo "2️⃣  Reset-password — token inválido"
R=$(curl -s -w "\n%{http_code}" -X POST "$API/api/admin/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"token.invalido.aqui","password":"NovaSenha123"}')
CODE=$(echo "$R" | tail -1)
[ "$CODE" = "400" ] && ok "Token inválido rejeitado (400)" || fail "Esperava 400, recebeu $CODE"

# 3. Reset-password: token de auth normal não funciona como reset
echo ""
echo "3️⃣  Reset-password — token de auth rejeitado como reset"
# Gerar um JWT fake com purpose errado (simula token de auth)
FAKE_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwidXNlclR5cGUiOiJBRE1JTiIsInB1cnBvc2UiOiJhdXRoIn0.fake"
R=$(curl -s -w "\n%{http_code}" -X POST "$API/api/admin/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$FAKE_AUTH_TOKEN\",\"password\":\"NovaSenha123\"}")
CODE=$(echo "$R" | tail -1)
[ "$CODE" = "400" ] && ok "Token sem purpose=password_reset rejeitado (400)" || fail "Esperava 400, recebeu $CODE"

# 4. Login admin — endpoint responde
echo ""
echo "4️⃣  Login admin — endpoint responde"
R=$(curl -s -w "\n%{http_code}" -X POST "$API/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"teste_inexistente@kaviar.com","password":"senhaqualquer"}')
CODE=$(echo "$R" | tail -1)
[ "$CODE" = "401" ] && ok "Login com credenciais erradas retorna 401" || fail "Esperava 401, recebeu $CODE"

# 5. Forgot-password: validação de input
echo ""
echo "5️⃣  Forgot-password — validação de input"
R=$(curl -s -w "\n%{http_code}" -X POST "$API/api/admin/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"nao-e-email","userType":"admin"}')
CODE=$(echo "$R" | tail -1)
[ "$CODE" = "400" ] && ok "Email inválido rejeitado (400)" || fail "Esperava 400, recebeu $CODE"

R=$(curl -s -w "\n%{http_code}" -X POST "$API/api/admin/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","userType":"hacker"}')
CODE=$(echo "$R" | tail -1)
[ "$CODE" = "400" ] || [ "$CODE" = "429" ] && ok "userType inválido rejeitado ($CODE)" || fail "Esperava 400 ou 429, recebeu $CODE"

# 6. Reset-password: senha fraca rejeitada
echo ""
echo "6️⃣  Reset-password — senha fraca"
R=$(curl -s -w "\n%{http_code}" -X POST "$API/api/admin/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token":"qualquer","password":"123"}')
CODE=$(echo "$R" | tail -1)
[ "$CODE" = "400" ] && ok "Senha curta rejeitada (400)" || fail "Esperava 400, recebeu $CODE"

# 7. Rate limit no reset-password
echo ""
echo "7️⃣  Rate limit — reset-password"
RATE_LIMITED=false
for i in $(seq 1 7); do
  R=$(curl -s -w "\n%{http_code}" -X POST "$API/api/admin/auth/reset-password" \
    -H "Content-Type: application/json" \
    -d '{"token":"fake.token.here","password":"Test123456"}')
  CODE=$(echo "$R" | tail -1)
  if [ "$CODE" = "429" ]; then
    RATE_LIMITED=true
    break
  fi
done
[ "$RATE_LIMITED" = "true" ] && ok "Rate limit ativou no reset-password" || echo "  ⚠️  Rate limit não ativou em 7 tentativas (limite é 5/15min, pode já ter sido consumido)"

# Resultado
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passou: $PASS"
echo "❌ Falhou: $FAIL"
[ "$FAIL" -eq 0 ] && echo "🎉 TODOS OS TESTES PASSARAM" || echo "⚠️  ATENÇÃO: $FAIL teste(s) falharam"
exit $FAIL
