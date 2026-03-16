import os
from contextlib import redirect_stderr

import yt_dlp

from .ui import console


class SilentLogger:
    """No-op logger used to silence yt-dlp output."""

    def debug(self, _msg):
        pass

    def warning(self, _msg):
        pass

    def error(self, _msg):
        pass


_BROWSER = None
_AUTH_READY = False


def detect_browser():
    """Detect browser cookies for authenticated yt-dlp requests."""
    for browser in ("opera", "edge", "chrome", "brave", "firefox","chromium","safariw"):
        try:
            with open(os.devnull, "w", encoding="utf-8") as devnull, redirect_stderr(devnull):
                with yt_dlp.YoutubeDL(
                    {
                        "quiet": True,
                        "no_warnings": True,
                        "logger": SilentLogger(),
                        "cookiesfrombrowser": (browser,),
                        "skip_download": True,
                    }
                ) as ydl:
                    ydl.cookiejar
            return browser
        except Exception:
            continue
    return None


def setup_auth():
    """Initialize auth context once per session."""
    global _BROWSER, _AUTH_READY
    if _AUTH_READY:
        return
    with console.status("[bold cyan]Setting up cookies/auth...", spinner="dots"):
        _BROWSER = detect_browser()
        _AUTH_READY = True


def base_opts(ignore_errors=True):
    """Build shared yt-dlp options."""
    setup_auth()
    opts = {
        "quiet": True,
        "no_warnings": True,
        "logger": SilentLogger(),
        "ignoreerrors": ignore_errors,
    }
    if _BROWSER:
        opts["cookiesfrombrowser"] = (_BROWSER,)
    return opts


def browser_name():
    return _BROWSER
