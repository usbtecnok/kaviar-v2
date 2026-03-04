# 📚 Índice - EAS Build (2 APKs Separados)

## 🚀 Início Rápido

1. **Primeiro acesso?** → Leia [`COMO_GERAR_APKS.md`](./COMO_GERAR_APKS.md)
2. **Só quer os comandos?** → Veja [`COMANDOS_RAPIDOS.md`](./COMANDOS_RAPIDOS.md)
3. **Quer usar o helper?** → Execute `./build-apk.sh`

## 📖 Documentação

| Arquivo | Descrição |
|---------|-----------|
| [`COMO_GERAR_APKS.md`](./COMO_GERAR_APKS.md) | Guia completo de como gerar os 2 APKs |
| [`COMANDOS_RAPIDOS.md`](./COMANDOS_RAPIDOS.md) | Referência rápida de comandos |
| [`ESTRUTURA_PROJETO.md`](./ESTRUTURA_PROJETO.md) | Como funciona a estrutura do projeto |
| [`build-apk.sh`](./build-apk.sh) | Script helper interativo |

## 🔧 Arquivos de Config

| Arquivo | Descrição |
|---------|-----------|
| [`app.config.js`](./app.config.js) | Config dinâmica (driver/passenger) |
| [`eas.json`](./eas.json) | Profiles de build do EAS |
| [`.env`](./.env) | EAS project IDs (preencher) |
| [`.env.example`](./.env.example) | Template do .env |

## 🎨 Assets

| Arquivo | Descrição |
|---------|-----------|
| `assets/icon-driver.png` | Ícone do motorista (1024x1024) |
| `assets/icon-passenger.png` | Ícone do passageiro (1024x1024) |
| `assets/adaptive-icon-driver.png` | Ícone adaptativo motorista |
| `assets/adaptive-icon-passenger.png` | Ícone adaptativo passageiro |
| `assets/splash-driver.png` | Splash do motorista (1284x2778) |
| `assets/splash-passenger.png` | Splash do passageiro (1284x2778) |

## 📦 Packages

| Package | Descrição |
|---------|-----------|
| `com.kaviar.driver` | APK do motorista |
| `com.kaviar.passenger` | APK do passageiro |

## 🎯 Modo KAVIAR (Anti-Frankenstein)

✅ 1 base só (mesmo repo)  
✅ 2 variants separadas por config  
✅ Nada de gambiarra em runtime  
✅ Separação limpa: nome, package, ícones, splash  
✅ Commits pequenos + evidência  
✅ Sem aumentar infraestrutura (mantém 1 task)

## 🔗 Links Úteis

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Dashboard](https://expo.dev)
- [Expo Config](https://docs.expo.dev/workflow/configuration/)

## 📊 Status

- ✅ Config criada
- ✅ Assets separados
- ✅ Documentação completa
- ✅ Script helper
- ✅ Commitado e pushado
- ⏳ Setup EAS (você executa)
- ⏳ Build APKs (você executa)

## 🆘 Ajuda

- **Erro no build?** → Veja [`COMO_GERAR_APKS.md`](./COMO_GERAR_APKS.md) seção "Troubleshooting"
- **Dúvida sobre estrutura?** → Veja [`ESTRUTURA_PROJETO.md`](./ESTRUTURA_PROJETO.md)
- **Quer customizar assets?** → Veja [`ESTRUTURA_PROJETO.md`](./ESTRUTURA_PROJETO.md) seção "Customizar Assets"

## 📝 Commits

```
12ee652 - feat(app): config 2 APKs separados (driver/passenger) via EAS Build
d53b5d7 - docs(app): adiciona script helper e resumo executivo EAS Build
dbc2cd9 - docs(app): adiciona comandos rápidos EAS Build
725e2b1 - docs(app): adiciona doc da estrutura do projeto EAS Build
```

---

**Pronto para gerar os APKs! 🚀**
