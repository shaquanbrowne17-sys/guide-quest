#!/bin/bash
# Builds the 3D arcade into $1 (a site folder): play.html, games/gq3d.js and games/assets/.
set -e
OUT=${1:?site folder}
cd "$(dirname "$0")"
node extract.js ../gq14 >/dev/null
mkdir -p "$OUT/games/assets/k"
npx esbuild src/main.js --bundle --format=esm --minify --target=es2019 --legal-comments=none --outfile="$OUT/games/gq3d.js" --log-level=warning
cp play.html "$OUT/play.html"
cp assets/*.glb assets/*.png "$OUT/games/assets/"
cp assets/k/*.glb "$OUT/games/assets/k/"; mkdir -p "$OUT/games/assets/k/Textures"; cp assets/k/Textures/*.png "$OUT/games/assets/k/Textures/"
ls -la "$OUT/games/gq3d.js" | awk '{print "bundle", $5}'
