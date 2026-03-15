import yt_dlp

from .auth import base_opts
from .net import fallback_message
from .ui import console


def get_stream_url(youtube_url, quiet=False):
    """Resolve direct audio stream URL and metadata for playback."""
    opts = {**base_opts(ignore_errors=False), "format": "bestaudio"}
    try:
        if quiet:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
        else:
            with console.status("[bold cyan]Fetching stream...", spinner="dots"):
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(youtube_url, download=False)
    except Exception as exc:
        raise RuntimeError(fallback_message("open this song stream", exc)) from exc

    return info["url"], info["title"], info.get("duration", 0)
