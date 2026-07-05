# KAVIAR - AABs finais para Google Play

## Objetivo

Este documento registra os Android App Bundles finais gerados para preparação de envio ao Google Play Console.

Os arquivos AAB foram gerados pelo EAS Build usando os perfis de release configurados em `eas.json`.

## KAVIAR Motorista

Package:

- com.kaviar.driver

Perfil EAS:

- driver-release

Build EAS:

- 4bafdd12-0ddc-47cd-81c2-5eb1b4f3f29b

Arquivo local:

- artifacts/play-review/aab-final/kaviar-driver-v6-play.aab

Validação local:

- Arquivo reconhecido como Zip archive data
- Estrutura AAB contém BundleConfig.pb
- Estrutura AAB contém base/assets/app.config
- Estrutura AAB contém base/assets/app.manifest
- Estrutura AAB contém base/dex/
- Estrutura AAB contém base/lib/

## KAVIAR Passageiro

Package:

- com.kaviar.passenger

Perfil EAS:

- passenger-release

Build EAS:

- 1d92b91f-c785-423e-9aa2-a4529546c681

Arquivo local:

- artifacts/play-review/aab-final/kaviar-passenger-v22-play.aab

Validação local:

- Arquivo reconhecido como Zip archive data
- Estrutura AAB contém BundleConfig.pb
- Estrutura AAB contém base/assets/app.config
- Estrutura AAB contém base/assets/app.manifest
- Estrutura AAB contém base/dex/
- Estrutura AAB contém base/lib/

## Observações

- Estes AABs ainda não foram enviados ao Google Play Console.
- Estes AABs não devem ser commitados no repositório.
- O envio ao Play Console deve ocorrer somente após a conta de organização estar finalizada e os dados obrigatórios da loja estarem preenchidos.
- A primeira publicação deve ser feita em teste fechado ou interno, antes de revisão pública.
