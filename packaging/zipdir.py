#!/usr/bin/env python3
"""Zip a directory tree into a distributable archive.

zipfile's default writer follows symlinks and stores only regular-file mode
bits. macOS .app bundles are built almost entirely from framework symlinks, so
following them both bloats the archive and produces a bundle that macOS may
refuse to launch. Storing them as real symlink entries keeps the bundle valid.
"""
import os
import stat
import sys
import zipfile


def zip_tree(src, dest, top):
    with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for dirpath, dirnames, filenames in os.walk(src):
            for name in sorted(dirnames) + sorted(filenames):
                full = os.path.join(dirpath, name)
                arc = os.path.join(top, os.path.relpath(full, src))
                st = os.lstat(full)
                info = zipfile.ZipInfo(arc)
                info.date_time = (2024, 1, 1, 0, 0, 0)
                info.create_system = 3
                if stat.S_ISLNK(st.st_mode):
                    info.external_attr = (stat.S_IFLNK | 0o777) << 16
                    z.writestr(info, os.readlink(full))
                elif stat.S_ISDIR(st.st_mode):
                    info.external_attr = ((stat.S_IFDIR | 0o755) << 16) | 0x10
                    z.writestr(info, b'')
                elif stat.S_ISREG(st.st_mode):
                    # Preserve the executable bit so binaries run after unzip.
                    info.external_attr = (st.st_mode & 0o777) << 16
                    with open(full, 'rb') as fh:
                        z.writestr(info, fh.read(), zipfile.ZIP_DEFLATED, compresslevel=6)
    print('wrote', dest, os.path.getsize(dest))


if __name__ == '__main__':
    zip_tree(sys.argv[1], sys.argv[2], sys.argv[3])
