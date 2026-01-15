#!/usr/bin/env bash
set -euo pipefail

cd /vercel/sandbox/workspace

echo "=== Incurator Artist OS init ==="

# 1. Verify directories exist
required_dirs=(profile tasks releases marketing progress .trace .index)
for dir in "${required_dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "ERROR: Missing directory: $dir"
    exit 1
  fi
done
echo "✓ Workspace structure verified"

# 2. Verify critical files exist
required_files=(CLAUDE.md profile/artist.json progress/claude-progress.md)
for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Missing file: $file"
    exit 1
  fi
done
echo "✓ Critical files verified"

# 3. Basic verification placeholder
# Future: API health check

printf "=== Session Ready ===\n"
