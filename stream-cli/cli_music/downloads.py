import os
import shutil

import yt_dlp

from .auth import base_opts
from .constants import MUSIC_DIR
from .net import fallback_message
from .ui import console


AUDIO_FORMAT_SELECTOR = (
    "bestaudio[ext=m4a]/"
    "bestaudio[acodec^=mp4a]/"
    "bestaudio[ext=mp3]/"
    "bestaudio[ext=aac]/"
    "bestaudio/best"
)


def ffmpeg_available():
    """Check whether ffmpeg is available in PATH."""
    return bool(shutil.which("ffmpeg") or shutil.which("ffmpeg.exe"))


def ydl_download_opts(convert_to_mp3=True):
    """Construct yt-dlp options for resilient audio downloads."""
    os.makedirs(MUSIC_DIR, exist_ok=True)
    opts = base_opts(ignore_errors=False)
    opts.update(
        {
            "format": AUDIO_FORMAT_SELECTOR,
            "outtmpl": os.path.join(MUSIC_DIR, "%(title)s.%(ext)s"),
        }
    )

    if convert_to_mp3 and ffmpeg_available():
        opts["postprocessors"] = [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ]

    return opts


def should_retry_without_conversion(exc):
    """Detect failures that are likely caused by ffmpeg post-processing."""
    lowered = str(exc).lower()
    tokens = ["ffmpeg", "postprocess", "post-process", "conversion", "extractaudio"]
    return any(token in lowered for token in tokens)


def run_download(song, convert_to_mp3=True):
    """Run a single yt-dlp download with selected conversion behavior."""
    with yt_dlp.YoutubeDL(ydl_download_opts(convert_to_mp3=convert_to_mp3)) as ydl:
        ydl.download([song["webpage_url"]])


def download_song(song):
    """Download a single song entry as mp3."""
    try:
        with console.status(f"[bold cyan]Downloading [italic]{song['title']}[/italic]...", spinner="dots"):
            run_download(song, convert_to_mp3=True)
        console.print(f"[bold green]Saved in: {MUSIC_DIR}[/bold green]")
    except Exception as exc:
        if should_retry_without_conversion(exc):
            try:
                with console.status(
                    "[bold cyan]Retrying without conversion (original audio format)...[/bold cyan]",
                    spinner="dots",
                ):
                    run_download(song, convert_to_mp3=False)
                console.print(
                    f"[bold green]Saved in original audio format in: {MUSIC_DIR}[/bold green]"
                )
                return
            except Exception as retry_exc:
                console.print(f"[yellow]{fallback_message('download this song', retry_exc)}[/yellow]")
                return

        console.print(f"[yellow]{fallback_message('download this song', exc)}[/yellow]")


def download_playlist_songs(songs):
    """Download all songs currently loaded in queue."""
    console.print(f"[bold cyan]Downloading playlist ({len(songs)} songs)...[/bold cyan]")
    for i, song in enumerate(songs, 1):
        try:
            with console.status(f"[bold cyan][{i}/{len(songs)}] {song['title']}[/bold cyan]", spinner="dots"):
                run_download(song, convert_to_mp3=True)
        except Exception as exc:
            if should_retry_without_conversion(exc):
                try:
                    with console.status(
                        f"[bold cyan][{i}/{len(songs)}] Retrying {song['title']} without conversion[/bold cyan]",
                        spinner="dots",
                    ):
                        run_download(song, convert_to_mp3=False)
                    continue
                except Exception as retry_exc:
                    console.print(
                        f"[yellow]Skipped {song['title']}: {fallback_message('download this track', retry_exc)}[/yellow]"
                    )
                    continue

            console.print(f"[yellow]Skipped {song['title']}: {fallback_message('download this track', exc)}[/yellow]")
    console.print(f"[bold green]Playlist download complete in: {MUSIC_DIR}[/bold green]")
