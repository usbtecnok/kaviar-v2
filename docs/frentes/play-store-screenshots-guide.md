# Play Store — Guia de Screenshots e Assets

## Requisitos Google Play

| Asset | Tamanho | Obrigatório |
|-------|---------|-------------|
| Ícone (hi-res) | 512x512 PNG | ✅ |
| Feature graphic | 1024x500 PNG/JPG | ✅ |
| Screenshots | Mín 2, máx 8 por app | ✅ (mín 2) |
| Screenshots tamanho | 16:9 ou 9:16, mín 320px, máx 3840px | ✅ |

## Screenshots recomendados

### Kaviar Passageiro (4-6 screenshots)
1. **Tela inicial** — mapa com campo "Para onde?" 
2. **Solicitação** — preço exibido, botão "Solicitar corrida"
3. **Acompanhamento** — motorista no mapa indo até o passageiro
4. **Corrida em andamento** — rota no mapa
5. **Histórico** — lista de corridas anteriores
6. **Avaliação** — tela de avaliação do motorista

### Kaviar Motorista (4-6 screenshots)
1. **Tela online** — botão "Ficar Online" / status online
2. **Oferta de corrida** — card com origem, destino, valor
3. **Navegação** — mapa com rota até o passageiro
4. **Corrida ativa** — corrida em andamento
5. **Ganhos** — resumo de ganhos/créditos
6. **Notificação** — push com vinheta KAVIAR (diferencial)

## Como capturar

### Opção 1: Celular real (recomendado)
```bash
# Via ADB
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./screenshot-01.png
```

### Opção 2: Emulador
- Android Studio → AVD com resolução 1080x1920 ou 1080x2400
- Capturar com botão de screenshot do emulador

### Opção 3: Mockup com frame
- Usar https://mockuphone.com ou https://deviceframes.com
- Colocar screenshot dentro de frame de celular
- Adicionar texto descritivo acima/abaixo

## Ícone 512x512

Já temos os ícones em `assets/`:
- `icon-driver.png` — verificar se é 512x512
- `icon-passenger.png` — verificar se é 512x512

Se forem menores, redimensionar com fundo `#1a1a1a`.

## Feature Graphic 1024x500

Criar imagem com:
- Fundo escuro (#1a1a1a)
- Logo KAVIAR centralizado
- Tagline: "Mobilidade comunitária"
- Pode usar Canva, Figma ou similar

## Checklist antes de submeter

- [ ] Ícone 512x512 para Motorista
- [ ] Ícone 512x512 para Passageiro
- [ ] Feature graphic 1024x500 para Motorista
- [ ] Feature graphic 1024x500 para Passageiro
- [ ] Mínimo 2 screenshots Motorista
- [ ] Mínimo 2 screenshots Passageiro
- [ ] Textos de listing prontos (ver play-store-listing.md)
- [ ] Política de privacidade publicada em https://kaviar.com.br/privacidade
