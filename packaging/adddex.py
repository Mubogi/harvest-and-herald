"""Append classes.dex to an APK (no zip binary available in this image)."""
import sys, zipfile, shutil, os

apk, dex = sys.argv[1], sys.argv[2]
tmp = apk + ".tmp"
with zipfile.ZipFile(apk, 'r') as src, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as dst:
    for item in src.infolist():
        dst.writestr(item, src.read(item.filename))
    dst.write(dex, 'classes.dex')
shutil.move(tmp, apk)
print('added classes.dex ->', apk)
