# KAVIAR - Automated UI Map Evidence Capture

Script automatizado para capturar screenshots reais do modal "Ver no mapa" no admin KAVIAR.

## 🎯 Objetivo

Gerar evidência objetiva e repetível do funcionamento da UI de mapas, salvando screenshots em `audit/ui_map_evidence/` e relatório em markdown.

## 🔧 Pré-requisitos

```bash
# Instalar dependências
cd frontend-app
npm install --save-dev playwright dotenv
npx playwright install chromium

# Configurar credenciais
cp .env.example .env
# Editar .env com credenciais reais do admin
```

## 📋 Configuração (.env)

```bash
ADMIN_EMAIL=admin@kaviar.com
ADMIN_PASSWORD=sua_senha_admin
ADMIN_URL=https://kaviar-frontend.onrender.com
API_URL=https://kaviar-v2.onrender.com
```

## 🚀 Execução

```bash
cd frontend-app
node scripts/capture_map_evidence.mjs
```

## 📊 Casos de Teste

O script captura 4 screenshots automaticamente:

1. **Botafogo** - Polygon esperado
2. **Tijuca** - Polygon esperado  
3. **Glória** - Polygon esperado
4. **Morro da Providência** - SEM_DADOS esperado

## 📁 Saída

### Screenshots
- `audit/ui_map_evidence/Botafogo_polygon_render.png`
- `audit/ui_map_evidence/Tijuca_polygon_render.png`
- `audit/ui_map_evidence/Gloria_polygon_render.png`
- `audit/ui_map_evidence/Providencia_sem_dados.png`

### Relatório
- `audit/ui_map_evidence_report.md` - Análise completa com status de cada captura

## 🔍 Estratégia de Captura

1. **Login automático** no admin
2. **Navegação** para /admin/geofences
3. **Localização** do botão "Ver no mapa"
4. **Espera inteligente**:
   - Modal aparecer (10s timeout)
   - Container do mapa (10s timeout)
   - Tiles carregarem (5s timeout, não-crítico)
   - Buffer final de 2s para renderização completa
5. **Screenshot** com clip 1200x800 focado no modal
6. **Validação** de conteúdo (mapa + polígono)

## ⚠️ Tratamento de Erros

- **Timeout de tiles**: Continua e captura mesmo assim
- **Modal não encontrado**: Registra erro no relatório
- **Login falhou**: Para execução com erro claro
- **Map render incomplete**: Marca no relatório mas salva screenshot

## 🛡️ Governança

- **❌ Não altera**: migrations/seeds/endpoints/lógica de bônus
- **✅ Credenciais seguras**: Apenas via .env local
- **✅ Commits limpos**: Apenas screenshots + relatório
- **✅ Repetível**: Mesmo resultado a cada execução

---
*Automação via Playwright para evidência objetiva da UI de mapas KAVIAR.*
