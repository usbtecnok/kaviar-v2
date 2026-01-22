# Render Build Configuration
# Este arquivo documenta as variáveis de ambiente necessárias no Render

## Frontend (kaviar-frontend)
# Adicionar no Render Dashboard → Environment Variables:

VITE_API_BASE_URL=https://kaviar-v2.onrender.com

## Backend (kaviar-v2)
# Já configurado via Render Dashboard

## Importante:
# - Variáveis VITE_* precisam estar disponíveis no BUILD TIME
# - Após adicionar/modificar, fazer novo deploy
# - Verificar no build log se a variável foi injetada
