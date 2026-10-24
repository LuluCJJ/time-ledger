"""Copy this app's private debug-build data from one authorized Android device.

Requires USB debugging and an already-installed debuggable time-ledger APK.
The archive contains private records. Keep it outside public Git repositories.
"""

import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import tarfile
from datetime import datetime


PACKAGE = "app.personal.timeledger"


def run_text(adb: str, *args: str) -> str:
    result = subprocess.run([adb, *args], capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError((result.stderr or result.stdout or "adb failed").strip())
    return result.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True, help="Private directory outside the public repository")
    parser.add_argument("--adb", default="adb", help="Path to Android platform-tools adb executable")
    args = parser.parse_args()

    devices = [line.split()[0] for line in run_text(args.adb, "devices").splitlines()[1:] if line.endswith("\tdevice")]
    if len(devices) != 1:
        raise RuntimeError(f"Expected one authorized device, found {len(devices)}. No files were copied.")

    app_dir = run_text(args.adb, "-s", devices[0], "shell", "run-as", PACKAGE, "pwd")
    if not app_dir.startswith((f"/data/user/0/{PACKAGE}", f"/data/data/{PACKAGE}")):
        raise RuntimeError("The installed app is not accessible with run-as; no files were copied.")

    output_dir = args.output_dir.resolve()
    if any((ancestor / ".git").exists() for ancestor in (output_dir, *output_dir.parents)):
        raise RuntimeError("Output directory is inside a Git repository. Choose a private non-repository folder.")
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = f"time-ledger-debug-data-{datetime.now().strftime('%Y%m%d-%H%M%S')}.tar"
    target = output_dir / filename
    partial = output_dir / (filename + ".partial")
    if target.exists():
        raise RuntimeError("An archive with this timestamp already exists; rerun later instead of overwriting it.")
    digest = hashlib.sha256()
    count = 0

    try:
        with partial.open("xb") as destination:
            process = subprocess.Popen(
                [args.adb, "-s", devices[0], "exec-out", "run-as", PACKAGE, "tar", "-cf", "-", "."],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            assert process.stdout is not None
            while chunk := process.stdout.read(1024 * 1024):
                destination.write(chunk)
                digest.update(chunk)
                count += len(chunk)
            error = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
            if process.wait() != 0:
                raise RuntimeError(f"Android archive command failed: {error.strip()}")
            destination.flush()
            os.fsync(destination.fileno())

        with tarfile.open(partial, "r:") as archive:
            entries = archive.getnames()
            if not any("app_webview" in entry for entry in entries):
                raise RuntimeError("Archive has no WebView data; do not treat it as a ledger backup.")
        partial.replace(target)
    except Exception:
        partial.unlink(missing_ok=True)
        raise

    print(f"Private archive: {target}")
    print(f"Bytes: {count}")
    print(f"SHA-256: {digest.hexdigest()}")
    print("This is a raw debug-app copy, not a validated JSON restore. Keep it private and test recovery separately.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, RuntimeError, tarfile.TarError) as error:
        print(f"Backup stopped: {error}", file=sys.stderr)
        sys.exit(1)
