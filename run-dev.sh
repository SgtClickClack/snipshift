#!/bin/bash
# Start development server with tsx watch and ignore patterns to prevent restart loops
exec tsx watch \
  --clear-screen=false \
  --ignore 'node_modules/**' \
  --ignore 'dist/**' \
  --ignore 'client/**' \
  --ignore '.git/**' \
  --ignore 'attached_assets/**' \
  --ignore 'snipshift-next/**' \
  server/index.ts
