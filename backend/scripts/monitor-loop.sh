#!/bin/bash
while true; do
  echo "$(date '+%H:%M:%S') - Checking..."
  node dist/scripts/beta-monitor-dog.js passenger_favorites_matching phase2_rollout auto --expected-rollout=1 2>&1 | grep -E "(Config|Status|PASS|FAIL)"
  
  if [ $? -ne 0 ]; then
    echo "❌ FAIL - Rollback necessário!"
    node dist/scripts/update-rollout.js passenger_favorites_matching 0
    exit 1
  fi
  
  sleep 900
done
