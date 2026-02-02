#!/bin/bash

# Verificar se há task definition ativa
aws ecs list-tasks --cluster kaviar-cluster --region us-east-2 --output json | jq -r '.taskArns[]' | head -1
