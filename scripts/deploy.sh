#!/bin/bash
# Deploy script: syncs static HTML files to epa608-platform/public,
# then deploys from the platform so Next.js routes (/login, /signup, /dashboard) stay live.

set -e

STATIC_DIR="$(cd "$(dirname "$0")" && pwd)"
PLATFORM_DIR="/Users/trieu/Desktop/epa608-platform"

echo "🔄 Syncing static files to platform..."

# Sync all static files (HTML, CSS, JS, images, etc.) to platform/public
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.vercel' \
  --exclude='deploy.sh' --exclude='CLAUDE.md' --exclude='CONTENT-*.md' \
  --exclude='STYLE-GUIDE.md' --exclude='*.jsonl' --exclude='memory' \
  "$STATIC_DIR/" "$PLATFORM_DIR/public/"

echo "✅ Sync complete"
echo "🚀 Deploying from platform..."

cd "$PLATFORM_DIR"
npx vercel deploy --prod

echo "🎉 Done!"
