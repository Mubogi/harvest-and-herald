#!/usr/bin/env bash
# Package the game as Windows / macOS / Linux desktop apps.
#
#   packaging/build-desktop.sh [platform...]     # default: linux win32 darwin
#
# Output: dist/*.zip
#
# electron-packager refuses to target win32 from Linux unless Wine is installed
# (it needs Wine only to stamp the exe icon and version resource). An unstamped
# exe runs fine, so for Windows we unpack the official Electron zip and lay the
# app out ourselves instead of requiring a whole Windows compatibility layer.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist"
STAGE="$ROOT/.build/desktop"
VERSION="1.0.0"
ELECTRON_VERSION="31.7.7"
APP_NAME="Harvest & Herald"
PLATFORMS="${*:-linux win32 darwin}"

rm -rf "$STAGE"
mkdir -p "$STAGE" "$OUT"

echo "==> staging app"
mkdir -p "$STAGE/app/www"
cp -r "$ROOT/index.html" "$ROOT/downloads.html" "$ROOT/src" "$ROOT/styles" "$STAGE/app/www/"
cp "$ROOT/packaging/electron/main.js" "$ROOT/packaging/electron/package.json" "$STAGE/app/"
cp "$ROOT/packaging/icon.png" "$STAGE/app/icon.png"

cd "$STAGE"
echo "==> installing electron + packager"
npm install --no-audit --no-fund --silent electron@31 electron-packager@17 >/dev/null

build_with_packager() {
  local plat="$1" arch="$2" name="$3"
  echo "==> packaging $plat/$arch"
  npx electron-packager app "$APP_NAME" \
    --platform="$plat" --arch="$arch" \
    --out="$STAGE/out" --overwrite --prune=true \
    --app-version="$VERSION" \
    --icon="$STAGE/app/icon.png" >/dev/null
  python3 "$ROOT/packaging/zipdir.py" "$STAGE/out/$APP_NAME-$plat-$arch" "$OUT/$name.zip" "$name"
}

build_windows() {
  local name="HarvestAndHerald-$VERSION-windows-x64"
  local work="$STAGE/win-raw"
  echo "==> packaging win32/x64 (no Wine required)"
  rm -rf "$work" && mkdir -p "$work"
  curl -sSL -o "$STAGE/electron-win32.zip" \
    "https://github.com/electron/electron/releases/download/v$ELECTRON_VERSION/electron-v$ELECTRON_VERSION-win32-x64.zip"
  python3 - "$STAGE/electron-win32.zip" "$work" <<'PY'
import sys, zipfile
zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])
PY
  cp -r "$STAGE/app" "$work/resources/app"
  rm -f "$work/resources/default_app.asar"
  mv "$work/electron.exe" "$work/$APP_NAME.exe"
  python3 "$ROOT/packaging/zipdir.py" "$work" "$OUT/$name.zip" "$name"
}

for p in $PLATFORMS; do
  case "$p" in
    win32)  build_windows ;;
    darwin) build_with_packager darwin x64 "HarvestAndHerald-$VERSION-macos-x64" ;;
    linux)  build_with_packager linux  x64 "HarvestAndHerald-$VERSION-linux-x64" ;;
    *) echo "unknown platform $p"; exit 1 ;;
  esac
done

ls -lh "$OUT"/*.zip
