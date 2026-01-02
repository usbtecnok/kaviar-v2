# 🎨 KAVIAR LOGO - GUIA DE USO

## 📁 Estrutura de Assets

```
src/assets/
├── logo-kaviar-full.svg    # Logo completa (nome + subtítulo)
├── logo-kaviar-icon.svg    # Ícone simplificado (apenas K)
public/
└── favicon.svg             # Favicon para navegador
```

## 🧱 Componente KaviarLogo

### Uso Básico
```jsx
import KaviarLogo from '../components/common/KaviarLogo';

// Logo completa
<KaviarLogo variant="full" size="large" />

// Ícone apenas
<KaviarLogo variant="icon" size="small" />
```

### Props Disponíveis

| Prop | Tipo | Valores | Padrão | Descrição |
|------|------|---------|--------|-----------|
| `variant` | string | `'full'` \| `'icon'` | `'full'` | Versão da logo |
| `size` | string | `'small'` \| `'medium'` \| `'large'` | `'medium'` | Tamanho da logo |
| `color` | string | Qualquer cor CSS | `'inherit'` | Cor da logo |
| `sx` | object | Objeto de estilos MUI | - | Estilos customizados |

### Tamanhos por Variante

#### Variant: 'full'
- **small**: 120x36px
- **medium**: 160x48px  
- **large**: 200x60px

#### Variant: 'icon'
- **small**: 24x24px
- **medium**: 32x32px
- **large**: 48x48px

## 📍 Onde Usar Cada Versão

### Logo Completa (`variant="full"`)
- ✅ Tela de Login/Splash
- ✅ Páginas de erro (404, 403)
- ✅ Emails e documentos
- ✅ Marketing e apresentações

### Ícone (`variant="icon"`)
- ✅ AppBar/Header
- ✅ Menu lateral
- ✅ Favicon
- ✅ Notificações push

## 🎨 Diretrizes Visuais

### ✅ Fazer
- Usar em fundos neutros (branco, cinza claro)
- Manter proporções originais
- Usar `color="inherit"` para seguir tema
- Centralizar em telas de login

### ❌ Não Fazer
- Distorcer proporções
- Adicionar sombras ou efeitos
- Usar em fundos coloridos sem contraste
- Animar excessivamente

## 🔧 Exemplos de Implementação

### Tela de Login
```jsx
<KaviarLogo 
  variant="full" 
  size="large" 
  sx={{ mb: 2 }} 
/>
```

### AppBar
```jsx
<KaviarLogo 
  variant="icon" 
  size="small" 
  sx={{ mr: 2 }} 
/>
```

### Loading/Splash
```jsx
<KaviarLogo 
  variant="full" 
  size="medium" 
  sx={{ opacity: 0.8 }} 
/>
```

## 🔄 Troca Futura de Logo

Para trocar a logo no futuro:

1. Substitua os arquivos SVG em `src/assets/`
2. Mantenha os mesmos nomes de arquivo
3. Componente `KaviarLogo` funcionará automaticamente
4. Nenhuma refatoração necessária

## 🎯 Acessibilidade

- Logo sempre tem `alt="Kaviar"`
- SVG com `currentColor` para temas
- Contraste adequado em todos os fundos
- Tamanhos mínimos respeitados (24px+)
