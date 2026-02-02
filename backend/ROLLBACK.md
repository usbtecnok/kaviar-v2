# ROLLBACK IMEDIATO

## Comando
```bash
cd /home/goes/kaviar/backend
node dist/scripts/update-rollout.js passenger_favorites_matching 0
```

## Validar
```bash
node scripts/rollout-status.js
```

## Se precisar desligar completamente
```bash
node -e "
const { PrismaClient } = require('./node_modules/@prisma/client');
async function main() {
  const prisma = new PrismaClient();
  await prisma.feature_flags.update({
    where: { key: 'passenger_favorites_matching' },
    data: { enabled: false, rollout_percentage: 0 }
  });
  console.log('✅ Feature desligada');
  await prisma.\$disconnect();
}
main();
"
```
