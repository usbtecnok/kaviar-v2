# Virtual Fence Center Card - Documentação

## Uso

```tsx
import { VirtualFenceCenterCard } from '@/components/admin/VirtualFenceCenterCard';

// Na página de detalhes do motorista
<VirtualFenceCenterCard 
  driverId="de958397-882a-4f06-badf-0c0fe7d26f7a"
  token={authToken}
/>
```

## Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `driverId` | `string` | ID do motorista |
| `token` | `string` | Token JWT do admin autenticado |

## Funcionalidades

### ✅ Carregamento automático
- Ao montar, faz GET para buscar centro virtual existente
- Exibe loading spinner durante carregamento

### ✅ Estados visuais
- **Não definido**: Alert amarelo + texto explicativo
- **Definido**: Alert azul + coordenadas preenchidas + botão "Abrir no mapa"

### ✅ Validação local
- Latitude: -90 a 90
- Longitude: -180 a 180
- Mensagem de erro antes de enviar ao backend

### ✅ Operações CRUD
- **Salvar**: PUT com validação
- **Remover**: DELETE com confirmação (modal nativo)
- **Visualizar**: GET automático

### ✅ Mensagens de feedback
- Toast/Alert com sucesso/erro
- Tratamento de 403, 404 e erros genéricos
- Botão de fechar (X) no alert

### ✅ Integração com Google Maps
- Botão "Abrir no mapa" quando centro definido
- Abre em nova aba: `https://www.google.com/maps?q=lat,lng`

### ✅ Timestamp
- Exibe "Atualizado em: dd/mm/aaaa hh:mm" quando disponível
- Formatação em PT-BR usando date-fns

### ✅ Aviso de governança
- Alert no rodapé explicando impacto no matching/taxa
- Estilo outlined para não chamar muita atenção

## Dependências

```json
{
  "@mui/material": "^5.x",
  "lucide-react": "^0.x",
  "date-fns": "^3.x"
}
```

## Variável de ambiente

```env
REACT_APP_API_URL=https://api.kaviar.com.br
```

## Textos implementados

Todos os textos especificados estão implementados:

- ✅ Título: "Centro Virtual (Fallback 800m)"
- ✅ Descrição curta
- ✅ Labels: "Latitude", "Longitude"
- ✅ Placeholders: "Ex.: -23.5505", "Ex.: -46.6333"
- ✅ Status não definido
- ✅ Status ativo
- ✅ Botões: "Salvar Centro", "Remover Centro", "Abrir no mapa"
- ✅ Mensagens de sucesso/erro
- ✅ Aviso de governança

## Permissões

O componente respeita as permissões do backend:
- **SUPER_ADMIN**: pode salvar/remover
- **OPERATOR**: pode salvar/remover
- **ANGEL_VIEWER**: apenas visualização (GET)

Erro 403 é tratado com mensagem específica.
