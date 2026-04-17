#!/usr/bin/env python3
"""Upload migrantportal-landing static files to cPanel via FTP."""

import ftplib
import os
import sys
from pathlib import Path

FTP_HOST = "srv360.sellvir.com"
FTP_USER = "uual3121"
FTP_PASS = "25vE7j9l[Z#hGRs"
REMOTE_BASE = "/public_html/migrantportal.com"
LOCAL_DIR = Path(__file__).parent

# Files/dirs to skip
SKIP = {".git", ".github", "deploy_cpanel.py", "CNAME", "_headers", "node_modules"}

TEXT_EXTS = {".html", ".css", ".js", ".txt", ".xml", ".svg", ".json", ".md", ".htaccess"}


def upload_dir(ftp: ftplib.FTP, local: Path, remote: str) -> None:
    # Ensure remote dir exists
    try:
        ftp.mkd(remote)
        print(f"  mkdir {remote}")
    except ftplib.error_perm:
        pass  # already exists

    for item in sorted(local.iterdir()):
        if item.name in SKIP or item.name.startswith(".") and item.name != ".htaccess":
            continue
        remote_path = f"{remote}/{item.name}"
        if item.is_dir():
            upload_dir(ftp, item, remote_path)
        else:
            upload_file(ftp, item, remote_path)


def upload_file(ftp: ftplib.FTP, local: Path, remote: str) -> None:
    print(f"  upload {local.name} → {remote}")
    with open(local, "rb") as f:
        ftp.storbinary(f"STOR {remote}", f)


def main() -> None:
    print(f"Connecting to {FTP_HOST}...")
    ftp = ftplib.FTP()
    ftp.connect(FTP_HOST, 21, timeout=30)
    ftp.login(FTP_USER, FTP_PASS)
    ftp.set_pasv(True)
    print(f"Logged in as {FTP_USER}")

    # Ensure target dir exists
    try:
        ftp.mkd(REMOTE_BASE)
    except ftplib.error_perm:
        pass

    # Upload all files from local dir (flat — no subdirs in migrantportal-landing)
    files = sorted(LOCAL_DIR.iterdir())
    total = 0
    for item in files:
        if item.name in SKIP or (item.name.startswith(".") and item.name != ".htaccess"):
            continue
        if item.is_file():
            remote_path = f"{REMOTE_BASE}/{item.name}"
            print(f"  {item.name} → {remote_path}")
            with open(item, "rb") as f:
                ftp.storbinary(f"STOR {remote_path}", f)
            total += 1
        elif item.is_dir():
            upload_dir(ftp, item, f"{REMOTE_BASE}/{item.name}")

    ftp.quit()
    print(f"\nDone. {total} files uploaded to {REMOTE_BASE}")


if __name__ == "__main__":
    main()
