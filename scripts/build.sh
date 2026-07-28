#!/usr/bin/env bash
# Собирает zip для загрузки в Chrome Web Store.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(python3 -c "import json; print(json.load(open('extension/manifest.json'))['version'])")
mkdir -p dist
OUT="dist/youtube-floatplayer-${VERSION}.zip"
rm -f "$OUT"
(cd extension && zip -qr "../$OUT" . -x "*.DS_Store")
echo "Built $OUT"
unzip -l "$OUT" | tail -3
