#!/bin/bash
set -euo pipefail
exec bash "$(dirname "$0")/deploy-ecs-us-east-2.sh" "$@"
