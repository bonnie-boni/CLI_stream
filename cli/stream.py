import os
import re
import shutil
import subprocess
import threading
import time
from contextlib import redirect_stderr

import msvcrt
import questionary
import yt_dlp
from rich import box
from rich.console import Console
from rich.live import Live
from rich.panel import Panel

console = Console()
MUSIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "music")

GENRES = [
    "Afrobeats", "Amapiano", "Pop", "Rock", "Hip Hop", "R&B", "Reggae", "EDM",
    "Jazz", "Country", "Classical", "Gospel", "Soul", "Custom",
]

MOODS = [
    "Happy", "Chill", "Motivated", "Romantic", "Sad", "Focus", "Workout",
    "Party", "Worship", "Calm", "Custom",
]

MIX_KEYWORDS = [
    " mix", "mixtape", "playlist", "hour", "hours", "dj set", "non stop",
    "continuous", "best of", "compilation", "megamix",
]


class SilentLogger:
    def debug(self, _msg):
        pass

    def warning(self, _msg):
        pass

    def error(self, _msg):
        pass


# ── Auth / yt-dlp options ─────────────────────────────────────────────────────

_BROWSER = None
_AUTH_READY = False


def _detect_browser():
    for browser in ("opera", "edge", "chrome", "brave", "firefox"):
        try:
            with open(os.devnull, "w", encoding="utf-8") as devnull, redirect_stderr(devnull):
                with yt_dlp.YoutubeDL({
                    "quiet": True,
                    "no_warnings": True,
                    "logger": SilentLogger(),
                    "cookiesfrombrowser": (browser,),
                    "skip_download": True,
                }) as ydl:
                    ydl.cookiejar
            return browser
        except Exception:
            continue
    return None


def setup_auth():
    global _BROWSER, _AUTH_READY
    if _AUTH_READY:
        return
    with console.status("[bold cyan]Setting up cookies/auth...", spinner="dots"):
        _BROWSER = _detect_browser()
        _AUTH_READY = True


def _base_opts(ignore_errors=True):
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


# ── Search / filter / sort ────────────────────────────────────────────────────

def _parse_year(entry):
    date = entry.get("upload_date") or ""
    if len(date) >= 4 and date[:4].isdigit():
        return int(date[:4])
    text = entry.get("title") or ""
    match = re.search(r"\b(19\d{2}|20\d{2})\b", text)
    return int(match.group(1)) if match else 0


def _is_music_candidate(entry, allow_mixes):
    title = (entry.get("title") or "").lower()
    duration = entry.get("duration") or 0

    # Prefer song-like durations. If missing duration, keep candidate.
    duration_ok = duration == 0 or 60 <= duration <= 9 * 60
    if not duration_ok:
        return False

    if not allow_mixes and any(k in title for k in MIX_KEYWORDS):
        return False

    return True


def _sort_entries(entries, sort_mode):
    if sort_mode == "Newest":
        return sorted(entries, key=_parse_year, reverse=True)
    if sort_mode == "Oldest":
        return sorted(entries, key=lambda e: (_parse_year(e) == 0, _parse_year(e)))
    return entries


def search_youtube(query, allow_mixes=False, sort_mode="Relevance"):
    smart_query = f"{query} official audio"
    with console.status(f"[bold cyan]Searching [italic]{smart_query}[/italic]...", spinner="dots"):
        with yt_dlp.YoutubeDL(_base_opts(ignore_errors=True)) as ydl:
            results = ydl.extract_info(f"ytsearch25:{smart_query}", download=False)

    raw_entries = [e for e in (results.get("entries") or []) if e]
    filtered = [e for e in raw_entries if _is_music_candidate(e, allow_mixes)]
    if not filtered:
        filtered = raw_entries

    return _sort_entries(filtered, sort_mode)


def build_genre_mood_query():
    genre = questionary.select("Genre:", choices=GENRES).ask()
    if genre == "Custom":
        genre = questionary.text("Type genre:").ask()

    mood = questionary.select("Mood:", choices=MOODS).ask()
    if mood == "Custom":
        mood = questionary.text("Type mood:").ask()

    return f"{genre} {mood} songs"


# ── Stream helpers ────────────────────────────────────────────────────────────

def get_stream_url(youtube_url):
    opts = {**_base_opts(ignore_errors=False), "format": "bestaudio"}
    with console.status("[bold cyan]Fetching stream...", spinner="dots"):
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
    return info["url"], info["title"], info.get("duration", 0)


def _ydl_download_opts():
    os.makedirs(MUSIC_DIR, exist_ok=True)
    opts = _base_opts(ignore_errors=False)
    opts.update({
        "format": "bestaudio/best",
        "outtmpl": os.path.join(MUSIC_DIR, "%(title)s.%(ext)s"),
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
    })
    return opts


def download_song(song):
    with console.status(f"[bold cyan]Downloading [italic]{song['title']}[/italic]...", spinner="dots"):
        with yt_dlp.YoutubeDL(_ydl_download_opts()) as ydl:
            ydl.download([song["webpage_url"]])
    console.print(f"[bold green]Saved in: {MUSIC_DIR}[/bold green]")


def download_playlist_songs(songs):
    console.print(f"[bold cyan]Downloading playlist ({len(songs)} songs)...[/bold cyan]")
    opts = _ydl_download_opts()
    for i, song in enumerate(songs, 1):
        with console.status(f"[bold cyan][{i}/{len(songs)}] {song['title']}[/bold cyan]", spinner="dots"):
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([song["webpage_url"]])
            except Exception:
                console.print(f"[yellow]Skipped:[/yellow] {song['title']}")
    console.print(f"[bold green]Playlist download complete: {MUSIC_DIR}[/bold green]")


# ── Player detection ──────────────────────────────────────────────────────────

def find_player():
    mpv_candidates = [
        shutil.which("mpv"),
        r"C:\Users\User\AppData\Local\Microsoft\WindowsApps\mpv.exe",
        r"C:\Program Files\mpv\mpv.exe",
        r"C:\Program Files (x86)\mpv\mpv.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\mpv\mpv.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\mpv\mpv.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WindowsApps\mpv.exe"),
        os.path.expandvars(r"%USERPROFILE%\scoop\apps\mpv\current\mpv.exe"),
    ]
    for path in mpv_candidates:
        if path and os.path.isfile(path):
            return "mpv", path

    for player in ["vlc", "ffplay"]:
        path = shutil.which(player)
        if path:
            return player, path

    return None, None


# ── TUI ───────────────────────────────────────────────────────────────────────

def fmt_time(seconds):
    s = max(0, int(seconds))
    return f"{s // 60:02d}:{s % 60:02d}"


def render_player(title, elapsed, duration):
    width = 42
    if duration > 0:
        elapsed = min(elapsed, duration)
        ratio = min(elapsed / duration, 1.0)
    else:
        ratio = 0

    filled = int(width * ratio)
    bar = "█" * filled + "░" * (width - filled)
    body = (
        f"\n  [bold white]{title}[/bold white]\n\n"
        f"  [cyan]{bar}[/cyan]\n"
        f"  [dim]{fmt_time(elapsed)}[/dim]"
        + " " * (width - 1)
        + f"[dim]{fmt_time(duration)}[/dim]\n\n"
        + "  [bold yellow][ N ][/bold yellow] Next   "
        + "[bold yellow][ P ][/bold yellow] Prev   "
        + "[bold yellow][ Q ][/bold yellow] Quit   "
        + "[bold yellow][ S ][/bold yellow] Search\n"
        + "  [bold yellow][ D ][/bold yellow] Download Song   "
        + "[bold yellow][ D ][/bold yellow][bold yellow][ P ][/bold yellow] Download Playlist\n"
    )
    return Panel(body, title="[bold cyan]🎵  Now Playing[/bold cyan]", border_style="cyan", box=box.ROUNDED)


def show_closing(message="Bye, see you next time"):
    console.print(Panel(
        f"[bold cyan]{message}[/bold cyan]",
        title="[bold white]Session Closed[/bold white]",
        border_style="cyan",
        box=box.DOUBLE,
    ))


# ── Playback ──────────────────────────────────────────────────────────────────

ACTION_NEXT = "next"
ACTION_PREV = "prev"
ACTION_QUIT = "quit"
ACTION_SEARCH = "search"
ACTION_DOWNLOAD = "download"
ACTION_DOWNLOAD_PLAYLIST = "download_playlist"


def play_song(stream_url, title, duration, player_name, player_path):
    if player_name == "mpv":
        cmd = [player_path, "--no-video", "--really-quiet", "--input-terminal=no", stream_url]
    elif player_name == "vlc":
        cmd = [player_path, "--intf", "dummy", "--no-video", "--quiet", stream_url]
    else:
        cmd = [player_path, "-nodisp", "-autoexit", "-loglevel", "quiet", "-hide_banner", stream_url]

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    action = [None]
    started = time.time()

    def key_listener():
        while proc.poll() is None and action[0] is None:
            if msvcrt.kbhit():
                key = msvcrt.getch().upper()
                if key == b"D":
                    deadline = time.time() + 0.45
                    download_playlist = False
                    while time.time() < deadline:
                        if msvcrt.kbhit():
                            nxt = msvcrt.getch().upper()
                            if nxt == b"P":
                                download_playlist = True
                            break
                        time.sleep(0.02)
                    action[0] = ACTION_DOWNLOAD_PLAYLIST if download_playlist else ACTION_DOWNLOAD
                elif key == b"N":
                    action[0] = ACTION_NEXT
                elif key == b"P":
                    action[0] = ACTION_PREV
                elif key == b"Q":
                    action[0] = ACTION_QUIT
                elif key == b"S":
                    action[0] = ACTION_SEARCH

                if action[0]:
                    proc.terminate()
                    return
            time.sleep(0.04)

    threading.Thread(target=key_listener, daemon=True).start()

    live = Live(console=console, refresh_per_second=4)
    live.start()
    try:
        while proc.poll() is None and action[0] is None:
            elapsed = time.time() - started
            live.update(render_player(title, elapsed, duration or 0))
            time.sleep(0.25)
    finally:
        live.stop()

    proc.wait()
    return action[0]


# ── Playlist loop ─────────────────────────────────────────────────────────────

def _entry_label(song):
    year = _parse_year(song)
    y = str(year) if year else "----"
    dur = fmt_time(song.get("duration") or 0)
    return f"{song['title']}  [{y}]  ({dur})"


def pick_song(songs):
    labels = [_entry_label(s) for s in songs]
    choice = questionary.select("Pick a song:", choices=labels).ask()
    return labels.index(choice)


def run_playlist(songs, start_index=0):
    player_name, player_path = find_player()
    if not player_name:
        console.print("[bold red]No audio player found. Install mpv, VLC, or ffmpeg.[/bold red]")
        return ACTION_SEARCH

    idx = start_index
    while 0 <= idx < len(songs):
        song = songs[idx]

        try:
            stream_url, title, duration = get_stream_url(song["webpage_url"])
        except Exception:
            console.print(f"[yellow]Could not open:[/yellow] {song.get('title', 'Unknown')} (skipped)")
            idx += 1
            continue

        action = play_song(stream_url, title, duration, player_name, player_path)

        if action == ACTION_QUIT:
            return ACTION_QUIT
        if action == ACTION_SEARCH:
            return ACTION_SEARCH
        if action == ACTION_DOWNLOAD:
            try:
                download_song(song)
            except Exception:
                console.print("[yellow]Download failed for this song.[/yellow]")
            idx += 1
            continue
        if action == ACTION_DOWNLOAD_PLAYLIST:
            download_playlist_songs(songs)
            return ACTION_SEARCH
        if action == ACTION_PREV:
            idx = max(0, idx - 1)
        else:
            idx += 1

    return ACTION_SEARCH


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    setup_auth()
    if _BROWSER:
        console.print(f"[bold green]Auth ready using browser cookies: {_BROWSER}[/bold green]")
    else:
        console.print("[bold yellow]Auth ready (no browser cookies found).[/bold yellow]")

    console.print(Panel(
        "[bold white]Stream music from YouTube\n"
        "[cyan]N[/cyan]=Next  [cyan]P[/cyan]=Prev  [cyan]Q[/cyan]=Quit  [cyan]S[/cyan]=Search  "
        "[cyan]D[/cyan]=Download Song  [cyan]D+P[/cyan]=Download Playlist[/bold white]",
        title="[bold cyan]🎵  CLI Music Player[/bold cyan]",
        border_style="cyan",
        box=box.DOUBLE_EDGE,
    ))

    while True:
        mode = questionary.select(
            "Choose mode:",
            choices=["Search Song", "Discover by Genre + Mood"],
        ).ask()

        allow_mixes = questionary.confirm("Include mixes/playlists?", default=False).ask()
        sort_mode = questionary.select("Sort by year:", choices=["Relevance", "Newest", "Oldest"]).ask()

        if mode == "Search Song":
            query = questionary.text("Search query:").ask()
        else:
            query = build_genre_mood_query()

        songs = search_youtube(query, allow_mixes=allow_mixes, sort_mode=sort_mode)
        if not songs:
            console.print("[bold yellow]No songs found. Try a different query.[/bold yellow]")
            continue

        idx = pick_song(songs)
        result = run_playlist(songs, start_index=idx)
        if result == ACTION_QUIT:
            show_closing()
            break


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        show_closing()