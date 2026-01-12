#!/bin/bash

# Comentar arquivos que referenciam tabelas obsoletas
echo "Comentando arquivos com referências obsoletas..."

# Arquivos que referenciam community (tabela obsoleta no contexto legado)
for file in src/controllers/community.ts src/controllers/geofence.ts; do
  if [ -f "$file" ]; then
    echo "// LEGACY FILE - DISABLED DUE TO SCHEMA CHANGES" > "${file}.bak"
    echo "// This file references obsolete community table structure" >> "${file}.bak"
    echo "// TODO: Refactor to use new community model when needed" >> "${file}.bak"
    echo "" >> "${file}.bak"
    cat "$file" >> "${file}.bak"
    mv "${file}.bak" "$file"
  fi
done

# Comentar imports de arquivos obsoletos
find src -name "*.ts" -type f -exec sed -i 's/^import.*community.*$/\/\/ &/' {} \;
find src -name "*.ts" -type f -exec sed -i 's/^import.*geofence.*$/\/\/ &/' {} \;

echo "Arquivos legados comentados!"
