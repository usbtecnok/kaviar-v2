#!/bin/bash
set -euo pipefail

# Wrapper seguro: sempre deploy ECS no us-east-2
exec /home/goes/kaviar/deploy-ecs-us-east-2.sh "$@"
