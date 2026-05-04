"""
Relay hook for otogidb/ working directory.
Delegates to the parent repo's post_edit.py so hooks work regardless of CWD.
"""

import sys
import os
import subprocess

data = sys.stdin.buffer.read()

# otogidb/.claude/hooks/ -> otogidb/.claude/ -> otogidb/ -> OtogiReverse/
here = os.path.dirname(os.path.abspath(__file__))
parent_hook = os.path.normpath(
    os.path.join(here, "..", "..", "..", ".claude", "hooks", "post_edit.py")
)

if os.path.isfile(parent_hook):
    result = subprocess.run(
        [sys.executable, parent_hook], input=data, capture_output=True
    )
    if result.stdout:
        sys.stdout.buffer.write(result.stdout)
    if result.stderr:
        sys.stderr.buffer.write(result.stderr)
    sys.exit(result.returncode)
