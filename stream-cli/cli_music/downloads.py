import os

import yt_dlp

from .auth import base_opts
from .constants import MUSIC_DIR
from .net import fallback_message
from .ui import console


def ydl_download_opts():
    """Construct yt-dlp options for mp3 downloads."""
    os.makedirs(MUSIC_DIR, exist_ok=True)
    opts = base_opts(ignore_errors=False)
    opts.update(
        {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(MUSIC_DIR, "%(title)s.%(ext)s"),
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ],
        }
    )
    return opts


def download_song(song):
    """Download a single song entry as mp3."""
    try:
        with console.status(f"[bold cyan]Downloading [italic]{song['title']}[/italic]...", spinner="dots"):
            with yt_dlp.YoutubeDL(ydl_download_opts()) as ydl:
                ydl.download([song["webpage_url"]])
        console.print(f"[bold green]Saved in: {MUSIC_DIR}[/bold green]")
    except Exception as exc:
        console.print(f"[yellow]{fallback_message('download this song', exc)}[/yellow]")


def download_playlist_songs(songs):
    """Download all songs currently loaded in queue."""
    console.print(f"[bold cyan]Downloading playlist ({len(songs)} songs)...[/bold cyan]")
    opts = ydl_download_opts()
    for i, song in enumerate(songs, 1):
        try:
            with console.status(f"[bold cyan][{i}/{len(songs)}] {song['title']}[/bold cyan]", spinner="dots"):
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([song["webpage_url"]])
        except Exception as exc:
            console.print(f"[yellow]Skipped {song['title']}: {fallback_message('download this track', exc)}[/yellow]")
    console.print(f"[bold green]Playlist download complete in: {MUSIC_DIR}[/bold green]")
