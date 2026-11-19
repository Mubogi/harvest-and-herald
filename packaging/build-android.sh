#!/usr/bin/env bash
# Build the signed Android APK from the web game, without Gradle.
#
# Requires: JAVA_HOME pointing at a JDK 17+, ANDROID_HOME with
# build-tools (aapt2, d8, apksigner) and platforms/android-34.
#
#   packaging/build-android.sh
#
# Output: dist/HarvestAndHerald-1.0.0.apk
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG="$ROOT/packaging/android"
OUT="$ROOT/dist"
BUILD="$ROOT/.build/android"
BT="${ANDROID_HOME:?set ANDROID_HOME}/build-tools/34.0.0"
PLATFORM="${ANDROID_HOME}/platforms/android-34/android.jar"
VERSION="1.0.0"
APK="$OUT/HarvestAndHerald-$VERSION.apk"

rm -rf "$BUILD"
mkdir -p "$BUILD"/{gen,classes,dex,assets/www} "$OUT"

echo "==> staging web assets"
# The game is plain classic scripts, so a straight copy is enough.
cp -r "$ROOT/index.html" "$ROOT/downloads.html" "$ROOT/src" "$ROOT/styles" "$BUILD/assets/www/"

echo "==> aapt2 compile + link"
"$BT/aapt2" compile --dir "$PKG/res" -o "$BUILD/res.zip"
"$BT/aapt2" link \
  -o "$BUILD/base.apk" \
  -I "$PLATFORM" \
  --manifest "$PKG/AndroidManifest.xml" \
  -A "$BUILD/assets" \
  --java "$BUILD/gen" \
  --min-sdk-version 23 \
  --target-sdk-version 34 \
  --version-code 1 --version-name "$VERSION" \
  "$BUILD/res.zip"

echo "==> javac"
"$JAVA_HOME/bin/javac" -source 8 -target 8 -bootclasspath "$PLATFORM" \
  -d "$BUILD/classes" \
  $(find "$PKG/src" "$BUILD/gen" -name '*.java') 2>&1 | grep -v 'bootstrap class path' || true

echo "==> d8"
"$BT/d8" --min-api 23 --lib "$PLATFORM" --output "$BUILD/dex" \
  $(find "$BUILD/classes" -name '*.class')

echo "==> package"
python3 "$ROOT/packaging/adddex.py" "$BUILD/base.apk" "$BUILD/dex/classes.dex"

echo "==> zipalign"
"$BT/zipalign" -f -p 4 "$BUILD/base.apk" "$BUILD/aligned.apk"

echo "==> signing"
KEYSTORE="$ROOT/packaging/harvest-herald.jks"
if [ ! -f "$KEYSTORE" ]; then
  "$JAVA_HOME/bin/keytool" -genkeypair -v \
    -keystore "$KEYSTORE" -storepass harvestherald -keypass harvestherald \
    -alias harvest -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Harvest and Herald, OU=Games, O=Harvest and Herald, L=, S=, C=US" >/dev/null 2>&1
  echo "    generated $KEYSTORE"
fi
"$BT/apksigner" sign --ks "$KEYSTORE" --ks-pass pass:harvestherald \
  --key-pass pass:harvestherald --ks-key-alias harvest \
  --out "$APK" "$BUILD/aligned.apk"

echo "==> verifying"
"$BT/apksigner" verify --print-certs "$APK" | head -4
"$BT/aapt2" dump badging "$APK" | head -4
ls -lh "$APK"
echo "done: $APK"
