#!/bin/bash

# Script para abrir checklist de produção
# Uso: ./checklist.sh

clear
echo "📋 KAVIAR - CHECKLIST DE PRODUÇÃO"
echo "=================================="
echo ""

cat /home/goes/kaviar/PRODUCAO-CHECKLIST.md

echo ""
echo "=================================="
echo "💡 COMANDOS ÚTEIS:"
echo ""
echo "  Editar checklist:  nano /home/goes/kaviar/PRODUCAO-CHECKLIST.md"
echo "  Ver progresso:     grep -c '\\[x\\]' /home/goes/kaviar/PRODUCAO-CHECKLIST.md"
echo "  Ver pendentes:     grep '\\[ \\]' /home/goes/kaviar/PRODUCAO-CHECKLIST.md | wc -l"
echo ""
