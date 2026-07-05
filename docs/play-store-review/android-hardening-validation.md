# KAVIAR Android Play Review Hardening

Commit: 3a82b95f chore(android): harden play review build settings

## Correções
- minSdkVersion 29
- targetSdkVersion 36
- compileSdkVersion 36
- android:allowBackup=false
- CropImageActivity android:exported=false
- expo-build-properties instalado

## APKs validados
- Passageiro: artifacts/play-review/hardened-final/kaviar-passenger-v22-minsdk29.apk
- Motorista: artifacts/play-review/hardened-final/kaviar-driver-v6-minsdk29.apk

## AAPT
- com.kaviar.passenger: sdkVersion 29, targetSdkVersion 36
- com.kaviar.driver: sdkVersion 29, targetSdkVersion 36

## Firebase Test Lab
- Passageiro: Passed
- Motorista: Passed

## MobSF
- Confirmar que não aparecem mais:
  - minSdk=24 / Android 7
  - android:allowBackup=true
  - CropImageActivity exported=true
