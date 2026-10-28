import subprocess
import re
import sys
from pathlib import Path

def die(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)

def visudo_check(path: Path):
    proc = subprocess.run(
        ["visudo", "-cf", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    if proc.returncode != 0:
        die(proc.stderr.strip() or "visudo validation failed")

def normalize(cmd: str) -> str:
    return re.sub(r"\s+", " ", cmd.strip())
