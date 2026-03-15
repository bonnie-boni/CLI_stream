import os
import sys

if os.name == "nt":
    import msvcrt
else:
    import select
    import termios
    import tty


class KeyboardPoller:
    """Cross-platform non-blocking single-key reader for controls."""

    def __init__(self):
        self._fd = None
        self._old_settings = None
        self._enabled = False

    def __enter__(self):
        if os.name == "nt":
            self._enabled = True
            return self
        if not sys.stdin.isatty():
            return self
        self._fd = sys.stdin.fileno()
        self._old_settings = termios.tcgetattr(self._fd)
        tty.setcbreak(self._fd)
        self._enabled = True
        return self

    def __exit__(self, exc_type, exc, tb):
        if os.name != "nt" and self._enabled and self._fd is not None and self._old_settings is not None:
            termios.tcsetattr(self._fd, termios.TCSADRAIN, self._old_settings)

    def kbhit(self):
        if not self._enabled:
            return False
        if os.name == "nt":
            return msvcrt.kbhit()
        ready, _, _ = select.select([sys.stdin], [], [], 0)
        return bool(ready)

    def getch(self):
        if not self._enabled:
            return b""
        if os.name == "nt":
            return msvcrt.getch()
        return os.read(self._fd, 1)
