#!/usr/bin/env python3
"""Chrome native-messaging host: save an SGF sent by the extension and open it in Ogatak."""
import json
import os
import re
import struct
import subprocess
import sys

OGATAK = os.environ.get("OGATAK_PATH", "/opt/ogatak/ogatak")  # rewritten by install.sh
SAVE_DIR = os.path.expanduser("~/Downloads/ogs-sgf")


def read_message():
    raw = sys.stdin.buffer.read(4)
    if len(raw) < 4:
        sys.exit(0)
    (length,) = struct.unpack("=I", raw)
    return json.loads(sys.stdin.buffer.read(length).decode("utf-8"))


def send_message(obj):
    data = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("=I", len(data)) + data)
    sys.stdout.buffer.flush()


def handle(msg):
    sgf = msg.get("sgf", "")
    if not sgf.lstrip().startswith("("):
        raise ValueError("payload is not an SGF")
    name = os.path.basename(msg.get("filename") or "ogs.sgf")
    name = re.sub(r"[^\w.\-]", "_", name)
    if not name.lower().endswith(".sgf"):
        name += ".sgf"

    os.makedirs(SAVE_DIR, exist_ok=True)
    path = os.path.join(SAVE_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(sgf)

    # Detach so Chrome closing the host doesn't take Ogatak with it. If Ogatak is
    # already running, its single-instance handler opens the file in the existing window.
    subprocess.Popen(
        [OGATAK, path],
        cwd=os.path.dirname(OGATAK) or None,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    return {"ok": True, "path": path}


def main():
    try:
        send_message(handle(read_message()))
    except Exception as e:  # report back to the extension instead of dying silently
        send_message({"ok": False, "error": f"{type(e).__name__}: {e}"})


if __name__ == "__main__":
    main()
