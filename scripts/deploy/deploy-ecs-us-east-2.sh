#!/bin/bash
set -euo pipefail

# Wrapper seguro: sempre deploy ECS no us-east-2
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$SCRIPT_DIR/deploy-ecs.sh" "$@"
