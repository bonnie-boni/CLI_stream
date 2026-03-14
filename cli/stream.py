import os
import re
import shutil
import subprocess
import threading
import time
from contextlib import redirect_stderr

import msvcrt
import questionary
import psutil
import yt_dlp
from rich import box
from rich.console import Console
from rich.live import Live
from rich.panel import Panel

console = Console()
MUSIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "music")

GENRES = [
    "Afrobeats","Gospel", "Amapiano", "Pop", "Rock", "Hip Hop", "R&B", "Reggae", "EDM",
    "Jazz", "Country", "Classical", "Soul","Salsa", "Custom", 
]

MOODS = [
    "Happy", "Chill", "Hype", "Motivated", "Romantic", "Sad", "Focus", "Workout",
    "Party", "Worship", "Calm", "Custom",
]

MIX_KEYWORDS = [
    " mix", "mixtape", "playlist", "hour", "hours", "dj set", "non stop",
    "continuous", "best of", "compilation", "megamix",
]


class SilentLogger:
    """No-op logger used to silence yt-dlp output."""

    def debug(self, _msg):
        """Ignore debug logs."""
        pass

    def warning(self, _msg):
        """Ignore warning logs."""
        pass

    def error(self, _msg):
        """Ignore error logs."""
        pass


# ── Auth / yt-dlp options ─────────────────────────────────────────────────────

_BROWSER = None
_AUTH_READY = False


def _detect_browser():
    """Detect a browser with readable cookies for authenticated yt-dlp requests."""
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
    """Initialize auth context once per session."""
    global _BROWSER, _AUTH_READY
    if _AUTH_READY:
        return
    with console.status("[bold cyan]Setting up cookies/auth...", spinner="dots"):
        _BROWSER = _detect_browser()
        _AUTH_READY = True


def _ask_or_cancel(prompt):
    """Run a questionary prompt and treat cancellation as graceful app exit."""
    value = prompt.ask()
    if value is None:
        raise KeyboardInterrupt
    return value


def _base_opts(ignore_errors=True):
    """Build common yt-dlp options shared by all extract/download calls."""
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
    """Extract a best-effort year from upload date or title text."""
    date = entry.get("upload_date") or ""
    if len(date) >= 4 and date[:4].isdigit():
        return int(date[:4])
    text = entry.get("title") or ""
    match = re.search(r"\b(19\d{2}|20\d{2})\b", text)
    return int(match.group(1)) if match else 0


def _is_music_candidate(entry, allow_mixes):
    """Filter results to song-like entries and optionally remove mixes/playlists."""
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
    """Sort entries using selected year mode while preserving relevance default."""
    if sort_mode == "Newest":
        return sorted(entries, key=_parse_year, reverse=True)
    if sort_mode == "Oldest":
        return sorted(entries, key=lambda e: (_parse_year(e) == 0, _parse_year(e)))
    return entries


def _entry_key(entry):
    """Create a fallback dedupe key using stable identifiers when available."""
    return (entry.get("id") or entry.get("webpage_url") or entry.get("title") or "").strip().lower()


def _normalize_text(text):
    """Normalize text so near-duplicate songs can be matched reliably."""
    value = (text or "").lower()
    value = re.sub(r"\(.*?\)|\[.*?\]", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def _artist_name(entry):
    """Pick the best available artist/uploader field from an entry."""
    for field in ("artist", "uploader", "creator", "channel"):
        value = (entry.get(field) or "").strip()
        if value:
            return value
    return ""


def _title_artist_key(entry):
    """Build a semantic dedupe key based on normalized title and artist."""
    title = _normalize_text(entry.get("track") or entry.get("title") or "")
    artist = _normalize_text(_artist_name(entry))
    if title and artist:
        return f"{title}::{artist}"
    if title:
        return title
    return _entry_key(entry)


def _dedupe_entries(entries):
    """Remove duplicate songs while preserving first-seen ordering."""
    seen = set()
    unique = []
    for entry in entries:
        key = _title_artist_key(entry)
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        unique.append(entry)
    return unique


def search_youtube(query, allow_mixes=False, sort_mode="Relevance", limit=25, quiet=False):
    """Search YouTube and return filtered, sorted, deduplicated song entries.

    When `quiet` is True, skip spinner/status output for background tasks.
    """
    limit = max(1, min(int(limit), 200))
    smart_query = f"{query} official audio"
    if quiet:
        with yt_dlp.YoutubeDL(_base_opts(ignore_errors=True)) as ydl:
            results = ydl.extract_info(f"ytsearch{limit}:{smart_query}", download=False)
    else:
        with console.status(f"[bold cyan]Searching [italic]{smart_query}[/italic]...", spinner="dots"):
            with yt_dlp.YoutubeDL(_base_opts(ignore_errors=True)) as ydl:
                results = ydl.extract_info(f"ytsearch{limit}:{smart_query}", download=False)

    raw_entries = [e for e in (results.get("entries") or []) if e]
    filtered = [e for e in raw_entries if _is_music_candidate(e, allow_mixes)]
    if not filtered:
        filtered = raw_entries

    return _dedupe_entries(_sort_entries(filtered, sort_mode))


def build_genre_mood_query():
    """Prompt the user for genre and mood and build a search query."""
    genre = _ask_or_cancel(questionary.select("Genre:", choices=GENRES))
    if genre == "Custom":
        genre = _ask_or_cancel(questionary.text("Type genre:"))

    mood = _ask_or_cancel(questionary.select("Mood:", choices=MOODS))
    if mood == "Custom":
        mood = _ask_or_cancel(questionary.text("Type mood:"))

    return f"{genre} {mood} songs"


# ── Stream helpers ────────────────────────────────────────────────────────────

def get_stream_url(youtube_url, quiet=False):
    """Resolve a direct audio stream URL and metadata for playback.

    When `quiet` is True, skip spinner/status output so this can be used by a
    background prefetch thread without disturbing the live player panel.
    """
    opts = {**_base_opts(ignore_errors=False), "format": "bestaudio"}
    if quiet:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
    else:
        with console.status("[bold cyan]Fetching stream...", spinner="dots"):
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
    return info["url"], info["title"], info.get("duration", 0)


def _ydl_download_opts():
    """Construct yt-dlp options for mp3 downloads into the local music folder."""
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
    """Download a single song entry as mp3."""
    with console.status(f"[bold cyan]Downloading [italic]{song['title']}[/italic]...", spinner="dots"):
        with yt_dlp.YoutubeDL(_ydl_download_opts()) as ydl:
            ydl.download([song["webpage_url"]])
    console.print(f"[bold green]Saved in: {MUSIC_DIR}[/bold green]")


def download_playlist_songs(songs):
    """Download all songs currently loaded in the playlist queue."""
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
    """Locate a supported local player executable in common Windows paths."""
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
    """Format seconds into mm:ss for UI display."""
    s = max(0, int(seconds))
    return f"{s // 60:02d}:{s % 60:02d}"


def render_player(title, elapsed, duration, paused=False, repeat=False, track_num=0, total_tracks=0, status_message=None, next_title=None):
    """Render the rich now-playing panel with progress bar, pause state, song counter and optional status.

    `status_message` is an optional short string shown above the progress bar (e.g. "Building artist queue...").
    """
    width = 82
    if duration > 0:
        elapsed = min(elapsed, duration)
        ratio = min(elapsed / duration, 1.0)
    else:
        ratio = 0

    filled = int(width * ratio)
    bar = "█" * filled + "░" * (width - filled)

    # Pause/repeat indicators and song counter shown in the title bar
    state_tag = "  [bold red]⏸ PAUSED[/bold red]" if paused else ""
    repeat_tag = "  [bold green]🔁 REPEAT[/bold green]" if repeat else ""
    counter_tag = ""
    if total_tracks > 0:
        played  = max(0, track_num - 1)
        remaining = total_tracks - track_num
        counter_tag = (
            f"  [dim]Track {track_num}/{total_tracks}[/dim]  "
            f"[dim green]✔ {played} played[/dim green]  "
            f"[dim yellow]⏭ {remaining} remaining[/dim yellow]"
        )

    body = (
        f"\n          [bold white]{title}[/bold white]{state_tag}{repeat_tag}\n\n"

        + (f"  {counter_tag}\n" if counter_tag else "")
        + (f"\n  [italic cyan]{status_message}[/italic cyan]\n" if status_message else "\n")
        + f"  [cyan]{bar}[/cyan]\n"
        + f"  [dim]{fmt_time(elapsed)}[/dim]"
        + " " * (width - 1)
        + f"[dim]{fmt_time(duration)}[/dim]\n\n"

        + "  [bold yellow] Controls : [/bold yellow] \n\n  "
        + "  [bold yellow][ N ][/bold yellow] Next"
        + "  [bold yellow][ P ][/bold yellow] Prev"
        + "  [bold yellow][ R ][/bold yellow] Repeat On/Off"
        + "  [bold yellow][ Space ][/bold yellow] Pause/Resume"
        + "  [bold yellow][ L ][/bold yellow] Load More Songs"
        + "  [bold yellow][ S ][/bold yellow] Search\n"

        + "  [bold yellow][ D ][/bold yellow] Download Song   "
        + "  [bold yellow][ D + P ][/bold yellow] Download Playlist "
        + "  [bold yellow][ Q ][/bold yellow] Quit\n\n   "

        + "  [bold yellow] Next Song : [/bold yellow] \n  "
        + f"  [italic]{next_title or 'None (end of queue)'}[/italic]\n\n "
        
        

    )
    return Panel(body, title="[bold cyan]🎵  Now Playing[/bold cyan]", border_style="cyan", box=box.ROUNDED)


def show_closing(message="Bye👋, see you next time"):
    """Render a final goodbye panel when exiting the app."""
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
ACTION_PAUSE = "pause"

LOAD_MORE_CHOICE = " [ Load more Songs ]"
SEARCH_NEW_QUERY_CHOICE = " [ Search New Query ]"
QUIT_CHOICE = " [ Quit ]"

PICK_ACTION_LOAD_MORE = "pick_load_more"
PICK_ACTION_NEW_QUERY = "pick_new_query"
PICK_ACTION_QUIT = "pick_quit"

_ACTIVE_PROC = None
_ACTIVE_PROC_LOCK = threading.Lock()


def _kill_process_tree(proc):
    """Terminate the active player process tree to avoid overlapping playback."""
    if not proc or proc.poll() is not None:
        return

    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        else:
            proc.terminate()
        proc.wait(timeout=1.5)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


def _register_active_proc(proc):
    """Track the currently active playback process."""
    global _ACTIVE_PROC
    with _ACTIVE_PROC_LOCK:
        _ACTIVE_PROC = proc


def _clear_active_proc(proc=None):
    """Clear tracked playback process when it exits or is replaced."""
    global _ACTIVE_PROC
    with _ACTIVE_PROC_LOCK:
        if proc is None or _ACTIVE_PROC is proc:
            _ACTIVE_PROC = None


def stop_active_playback():
    """Stop any current playback so only one song can play at a time."""
    global _ACTIVE_PROC
    with _ACTIVE_PROC_LOCK:
        proc = _ACTIVE_PROC
        _ACTIVE_PROC = None
    _kill_process_tree(proc)


def _pause_proc(proc):
    """Suspend the player process tree so audio fully pauses."""
    try:
        root = psutil.Process(proc.pid)
        children = root.children(recursive=True)
        for child in children:
            try:
                child.suspend()
            except Exception:
                continue
        root.suspend()
    except Exception:
        pass


def _resume_proc(proc):
    """Resume the player process tree after pause."""
    try:
        root = psutil.Process(proc.pid)
        children = root.children(recursive=True)
        root.resume()
        for child in children:
            try:
                child.resume()
            except Exception:
                continue
    except Exception:
        pass


def play_song(stream_url, title, duration, player_name, player_path,
              live, track_num=0, total_tracks=0, status_ref=None, repeat_ref=None,
              on_download_song=None, on_load_more=None, next_title_ref=None):
    """Play one song using a shared Live panel and return the user action.

    `status_ref` is a one-element list whose string value is polled every render
    tick, so an external monitor thread can update the status badge live while
    the song is playing without interrupting playback.
    Pause/Resume suspends the OS process tree so audio actually halts.
    """
    stop_active_playback()

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
    _register_active_proc(proc)

    action = [None]
    paused = [False]
    # Track elapsed time separately so pauses don't advance the timer
    elapsed_accum = [0.0]
    segment_start = [time.time()]

    def key_listener():
        while proc.poll() is None and action[0] is None:
            if msvcrt.kbhit():
                key = msvcrt.getch()
                upper = key.upper()

                if key == b" ":           # Space bar — pause / resume
                    if paused[0]:
                        paused[0] = False
                        segment_start[0] = time.time()
                        _resume_proc(proc)
                    else:
                        elapsed_accum[0] += time.time() - segment_start[0]
                        paused[0] = True
                        _pause_proc(proc)

                elif upper == b"D":
                    deadline = time.time() + 0.45
                    download_playlist = False
                    while time.time() < deadline:
                        if msvcrt.kbhit():
                            nxt = msvcrt.getch().upper()
                            if nxt == b"P":
                                download_playlist = True
                            break
                        time.sleep(0.02)
                    if download_playlist:
                        action[0] = ACTION_DOWNLOAD_PLAYLIST
                    elif callable(on_download_song):
                        on_download_song()

                elif upper == b"N":
                    action[0] = ACTION_NEXT
                elif upper == b"P":
                    action[0] = ACTION_PREV
                elif upper == b"L":
                    if callable(on_load_more):
                        on_load_more()
                elif upper == b"R":
                    if repeat_ref is not None:
                        repeat_ref[0] = not repeat_ref[0]
                elif upper == b"Q":
                    action[0] = ACTION_QUIT
                elif upper == b"S":
                    action[0] = ACTION_SEARCH

                if action[0]:
                    if paused[0]:
                        _resume_proc(proc)   # un-suspend before kill
                    _kill_process_tree(proc)
                    return
            time.sleep(0.04)

    threading.Thread(target=key_listener, daemon=True).start()

    try:
        while proc.poll() is None and action[0] is None:
            if paused[0]:
                elapsed = elapsed_accum[0]
            else:
                elapsed = elapsed_accum[0] + (time.time() - segment_start[0])
            live.update(render_player(
                title, elapsed, duration or 0,
                paused=paused[0],
                repeat=repeat_ref[0] if repeat_ref else False,
                track_num=track_num,
                total_tracks=total_tracks,
                status_message=status_ref[0] if status_ref else None,
                next_title=next_title_ref[0] if next_title_ref else None,
            ))
            time.sleep(0.25)
    finally:
        pass  # Live stays open — owned by run_playlist

    if action[0] is not None:
        if paused[0]:
            _resume_proc(proc)
        _kill_process_tree(proc)
    try:
        proc.wait(timeout=2)
    except Exception:
        _kill_process_tree(proc)
    _clear_active_proc(proc)
    return action[0]


# ── Playlist loop ─────────────────────────────────────────────────────────────

def _entry_label(song):
    """Build a song label shown in the interactive picker."""
    year = _parse_year(song)
    y = str(year) if year else "----"
    dur = fmt_time(song.get("duration") or 0)
    artist = _artist_name(song)
    title = song["title"]
    if artist and artist.lower() not in title.lower():
        title = f"{title} - {artist}"
    return f"{title}  [{y}]  ({dur})"


def pick_song(songs, allow_load_more=False):
    """Prompt user to select a song, with optional load-more pseudo item."""
    labels = [_entry_label(s) for s in songs]
    if allow_load_more:
        labels.append(LOAD_MORE_CHOICE)
        labels.append(SEARCH_NEW_QUERY_CHOICE)
        labels.append(QUIT_CHOICE)
    choice = _ask_or_cancel(questionary.select("Pick a song:", choices=labels))
    if allow_load_more and choice == LOAD_MORE_CHOICE:
        return PICK_ACTION_LOAD_MORE
    if allow_load_more and choice == SEARCH_NEW_QUERY_CHOICE:
        return PICK_ACTION_NEW_QUERY
    if allow_load_more and choice == QUIT_CHOICE:
        return PICK_ACTION_QUIT
    return labels.index(choice)


def _normalize_url_entry(entry):
    """Normalize a yt-dlp URL entry into a playable song dictionary."""
    video_url = entry.get("webpage_url") or ""
    if not video_url:
        if entry.get("id"):
            video_url = f"https://www.youtube.com/watch?v={entry['id']}"
        elif entry.get("url", "").startswith("http"):
            video_url = entry["url"]

    return {
        "id": entry.get("id"),
        "title": entry.get("title") or "Unknown",
        "duration": entry.get("duration") or 0,
        "upload_date": entry.get("upload_date") or "",
        "webpage_url": video_url,
        "artist": entry.get("artist") or "",
        "uploader": entry.get("uploader") or "",
        "creator": entry.get("creator") or "",
        "channel": entry.get("channel") or "",
    }


def load_from_youtube_url(url):
    """Load songs from a user-supplied YouTube playlist/video URL."""
    with console.status("[bold cyan]Loading songs from URL...[/bold cyan]", spinner="dots"):
        with yt_dlp.YoutubeDL(_base_opts(ignore_errors=True)) as ydl:
            info = ydl.extract_info(url, download=False)

    if not info:
        return [], ""

    entries = info.get("entries") or [info]
    songs = []
    for entry in entries:
        if not entry:
            continue
        song = _normalize_url_entry(entry)
        if song.get("webpage_url"):
            songs.append(song)

    songs = _dedupe_entries(songs)
    label = info.get("title") or "Custom URL"
    return songs, label


def _extract_primary_artist(song):
    """Infer a primary artist from metadata or title for taste-based queue building."""
    artist = _artist_name(song)
    if artist:
        return artist

    title = (song.get("title") or "").strip()
    if " - " in title:
        head = title.split(" - ", 1)[0].strip()
        if head:
            return head
    if "|" in title:
        head = title.split("|", 1)[0].strip()
        if head:
            return head

    return ""


class ArtistQueueLoader:
    """Loads artist songs incrementally across multiple search batches.

    Each of the three search seeds fires a separate yt-dlp query so the queue
    grows in three visible waves.  A monitor thread writes live progress into a
    shared `status_ref` list that the player panel polls on every render tick.
    The currently-playing song is never interrupted; only the queue grows.
    """

    _SEARCH_SEEDS = ["{artist} songs", "{artist} music", "{artist} best songs"]
    BATCH_SIZE = 25

    def __init__(self, seed_song, allow_mixes=False, sort_mode="Relevance"):
        self.seed_song = seed_song
        self.allow_mixes = allow_mixes
        self.sort_mode = sort_mode
        self._lock = threading.Lock()
        self._songs = [seed_song]       # seed always at position 0
        self._artist = ""
        self.done = threading.Event()   # set when all batches finish

    def start(self):
        """Launch background loading thread and return immediately."""
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self):
        try:
            artist = _extract_primary_artist(self.seed_song)
            if not artist:
                return
            with self._lock:
                self._artist = artist

            seen = {_title_artist_key(self.seed_song)}

            for seed_template in self._SEARCH_SEEDS:
                query = seed_template.format(artist=artist)
                try:
                    results = search_youtube(
                        query,
                        allow_mixes=self.allow_mixes,
                        sort_mode=self.sort_mode,
                        limit=self.BATCH_SIZE,
                        quiet=True,
                    )
                except Exception:
                    continue

                new_songs = [e for e in results if _title_artist_key(e) not in seen]
                for e in new_songs:
                    seen.add(_title_artist_key(e))
                if new_songs:
                    with self._lock:
                        self._songs.extend(new_songs)
        except Exception:
            pass
        finally:
            self.done.set()

    def snapshot(self):
        """Thread-safe copy of the current queue and artist name."""
        with self._lock:
            return list(self._songs), self._artist

    def loaded_count(self):
        """Number of songs currently loaded (includes seed)."""
        with self._lock:
            return len(self._songs)


def run_playlist(songs, start_index=0, auto_artist_playlist=False, allow_mixes=False, sort_mode="Relevance"):
    """Run playback loop, growing the queue in the background via ArtistQueueLoader.

    Queue syncs happen silently *between* songs at the top of each loop
    iteration — the currently-playing track is never touched.  A monitor thread
    writes live progress into `status_ref` which the player panel polls every
    render tick, so the user sees e.g. '⏳ Building... 12/75 songs' updating
    in real time, and a badge '🎶 Now queued: Artist • 74 songs ready' once done.
    """
    player_name, player_path = find_player()
    if not player_name:
        console.print("[bold red]No audio player found. Install mpv, VLC, or ffmpeg.[/bold red]")
        return ACTION_SEARCH

    songs = list(songs)          # local copy so we can extend safely
    total = len(songs)
    idx = start_index
    songs_lock = threading.Lock()

    # Mutable one-element list polled by play_song on every render tick.
    status_ref = [None]
    repeat_ref = [False]

    prefetch_lock = threading.Lock()
    prefetch_state = {
        "ready_url": None,
        "payload": None,
        "loading_url": None,
    }

    download_lock = threading.Lock()
    queued_download_urls = set()
    load_more_lock = threading.Lock()
    load_more_state = {"loading": False}

    def _queue_song_download(song):
        """Queue a single song download in the background without stopping playback."""
        song_url = song.get("webpage_url")
        if not song_url:
            return

        with download_lock:
            if song_url in queued_download_urls:
                status_ref[0] = "⬇ Download already queued"
                return
            queued_download_urls.add(song_url)

        status_ref[0] = f"⬇ Download queued: {song.get('title', 'Unknown')}"

        def _download_worker():
            try:
                with yt_dlp.YoutubeDL(_ydl_download_opts()) as ydl:
                    ydl.download([song_url])
                status_ref[0] = f"⬇ Download complete: {song.get('title', 'Unknown')}"
            except Exception:
                status_ref[0] = f"⚠ Download failed: {song.get('title', 'Unknown')}"

        threading.Thread(target=_download_worker, daemon=True).start()

    def _queue_artist_load_more(seed_song, current_index=None, next_title_ref=None):
        """Load more songs for the selected artist in background and append unique entries."""
        artist = _extract_primary_artist(seed_song)
        if not artist:
            status_ref[0] = "⚠ No artist found for load more"
            return

        with load_more_lock:
            if load_more_state["loading"]:
                status_ref[0] = "⏳ Load more already running"
                return
            load_more_state["loading"] = True

        status_ref[0] = f"⏳ Loading more from {artist}..."

        def _load_more_worker():
            try:
                results = search_youtube(
                    f"{artist} songs",
                    allow_mixes=allow_mixes,
                    sort_mode=sort_mode,
                    limit=50,
                    quiet=True,
                )
                with songs_lock:
                    seen = {_title_artist_key(e) for e in songs}
                    additions = [e for e in results if _title_artist_key(e) not in seen]
                    if additions:
                        songs.extend(additions)
                    if (
                        next_title_ref is not None
                        and current_index is not None
                        and current_index + 1 < len(songs)
                    ):
                        next_title_ref[0] = songs[current_index + 1].get("title") or "Unknown"
                if additions:
                    status_ref[0] = f"🎵 Added {len(additions)} songs from {artist}"
                else:
                    status_ref[0] = f"ℹ No new songs found for {artist}"
            except Exception:
                status_ref[0] = f"⚠ Failed to load more songs for {artist}"
            finally:
                with load_more_lock:
                    load_more_state["loading"] = False

        threading.Thread(target=_load_more_worker, daemon=True).start()
    def _start_prefetch(next_song):
        """Prefetch direct stream metadata for the next song while current one plays."""
        if not next_song:
            return
        next_url = next_song.get("webpage_url")
        if not next_url:
            return

        with prefetch_lock:
            if prefetch_state["ready_url"] == next_url and prefetch_state["payload"] is not None:
                return
            if prefetch_state["loading_url"] == next_url:
                return
            prefetch_state["loading_url"] = next_url

        def _prefetch_worker(target_url):
            try:
                payload = get_stream_url(target_url, quiet=True)
            except Exception:
                with prefetch_lock:
                    if prefetch_state["loading_url"] == target_url:
                        prefetch_state["loading_url"] = None
                return

            with prefetch_lock:
                prefetch_state["ready_url"] = target_url
                prefetch_state["payload"] = payload
                if prefetch_state["loading_url"] == target_url:
                    prefetch_state["loading_url"] = None

        threading.Thread(target=_prefetch_worker, args=(next_url,), daemon=True).start()

    loader = None
    if auto_artist_playlist and songs:
        loader = ArtistQueueLoader(
            songs[start_index],
            allow_mixes=allow_mixes,
            sort_mode=sort_mode,
        )
        loader.start()
        total_expected = loader.BATCH_SIZE * len(loader._SEARCH_SEEDS)

        def _monitor_status():
            """Write live progress into status_ref; set badge when all batches done."""
            while not loader.done.wait(timeout=0.4):
                artist_songs = loader.loaded_count() - 1   # exclude seed
                status_ref[0] = (
                    f"\u23f3 Building artist queue\u2026 "
                    f"{artist_songs}/{total_expected} songs"
                )
            # All batches finished — flip to the ready badge.
            _, artist = loader.snapshot()
            final_count = loader.loaded_count() - 1
            if artist and final_count > 0:
                status_ref[0] = (
                    f"\U0001f3b6 Now queued: {artist}  \u2022  {final_count} songs ready"
                )
            else:
                status_ref[0] = None

        threading.Thread(target=_monitor_status, daemon=True).start()

    # One Live instance shared across all songs — panel is never recreated.
    with Live(console=console, refresh_per_second=4) as live:
        while True:
            with songs_lock:
                total = len(songs)
                if not (0 <= idx < total):
                    break

            # Silently extend the queue from whatever the loader has so far.
            # This runs between songs and never touches the active process.
            if loader is not None:
                live_queue, _ = loader.snapshot()
                if len(live_queue) > total:
                    with songs_lock:
                        songs = live_queue
                        total = len(songs)

            with songs_lock:
                song = songs[idx]
                total = len(songs)
                next_title_ref = [
                    (songs[idx + 1].get("title") or "Unknown") if idx + 1 < len(songs) else None
                ]
            track_num = idx + 1
            song_url = song.get("webpage_url")

            try:
                with prefetch_lock:
                    cached_payload = (
                        prefetch_state["payload"]
                        if prefetch_state["ready_url"] == song_url
                        else None
                    )

                if cached_payload is not None:
                    stream_url, title, duration = cached_payload
                else:
                    stream_url, title, duration = get_stream_url(song_url)
            except Exception:
                console.print(f"[yellow]Could not open:[/yellow] {song.get('title', 'Unknown')} (skipped)")
                idx += 1
                continue

            if idx + 1 < total:
                with songs_lock:
                    next_song = songs[idx + 1] if idx + 1 < len(songs) else None
                _start_prefetch(next_song)

            action = play_song(
                stream_url, title, duration,
                player_name, player_path,
                live,
                track_num=track_num,
                total_tracks=total,
                status_ref=status_ref,
                repeat_ref=repeat_ref,
                on_download_song=lambda s=song: _queue_song_download(s),
                on_load_more=lambda s=song, i=idx, ntr=next_title_ref: _queue_artist_load_more(s, i, ntr),
                next_title_ref=next_title_ref,
            )

            if action == ACTION_QUIT:
                stop_active_playback()
                return ACTION_QUIT
            if action == ACTION_SEARCH:
                stop_active_playback()
                return ACTION_SEARCH
            if action == ACTION_DOWNLOAD_PLAYLIST:
                stop_active_playback()
                download_playlist_songs(songs)
                return ACTION_SEARCH
            if action == ACTION_PREV:
                idx = max(0, idx - 1)
            elif action == ACTION_NEXT:
                idx += 1
            elif action is None and repeat_ref[0]:
                # Repeat same song after it ends naturally when repeat is enabled.
                idx = idx
            else:
                idx += 1

    stop_active_playback()
    return ACTION_SEARCH


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    """Run CLI interaction loop for search, playlist loading, and playback."""
    setup_auth()
    if _BROWSER:
        console.print(f"[bold green]Auth ready using browser cookies: {_BROWSER}[/bold green]")
    else:
        console.print("[bold yellow]Auth ready (no browser cookies found).[/bold yellow]")

    headset = (
        "        [cyan] ===  ||   ====      ===  ||      //\\   |   |  === || / [/cyan]\n"
        "        [cyan]||    ||    ||      ||==| ||     //_ \\  |___| |==  ||/  [/cyan]\n"
        "        [cyan] ===  ==== ====     ||     ===  //    \\ |____  === ||   [/cyan]\n\n"
        "[italic cyan][bold] Tips 💡 : [/bold] Search a song and artist for more better search results where possible.[/italic cyan]\n"
        "               [cyan]_____________________[/cyan]\n"
        "               [cyan]|                    |[/cyan]\n"
        "               [cyan]|[/cyan]  [bold cyan]\U0001f3b5 CLI Music \U0001f3b5[/bold cyan]   [cyan]|[/cyan]\n"
        "               [cyan]|____________________|[/cyan]\n"
    )
    
    console.print(Panel(
        headset +
        "  [cyan]Q[/cyan]=Quit   [cyan]S[/cyan]=Search\n"
        "  [cyan]D[/cyan]=Download Song   [cyan]D+P[/cyan]=Download Playlist",
        title="[bold cyan]🎵  CLI Music Player[/bold cyan]",
        border_style="cyan",
        box=box.DOUBLE_EDGE,
    ))

    while True:
        mode = _ask_or_cancel(questionary.select(
            "Choose mode:",
            choices=["Search Song", "Discover by Genre + Mood", "Play from YouTube URL\n", "Quit"],
        ))

        if mode == "Quit":
            show_closing()
            break

        if mode == "Play from YouTube URL":
            url = _ask_or_cancel(questionary.text("Paste YouTube URL (playlist or video):"))
            if not url:
                console.print("[yellow]No URL provided.[/yellow]")
                continue

            songs, source_label = load_from_youtube_url(url)
            if not songs:
                console.print("[bold yellow]No songs found from this URL.[/bold yellow]")
                continue

            console.print(f"[bold cyan]Loaded {len(songs)} songs from: {source_label}[/bold cyan]")
            idx = pick_song(songs, allow_load_more=False)
            result = run_playlist(songs, start_index=idx)
            if result == ACTION_QUIT:
                show_closing()
                break
            continue

        allow_mixes = _ask_or_cancel(questionary.confirm("Include mixes/playlists?", default=False))
        sort_mode = _ask_or_cancel(questionary.select("Sort by year:", choices=["Random", "Newest", "Oldest"]))

        if mode == "Search Song":
            query = _ask_or_cancel(questionary.text("Search query:"))
        else:
            query = build_genre_mood_query()

        idx = None
        while idx is None:
            fetch_limit = 25
            songs = search_youtube(query, allow_mixes=allow_mixes, sort_mode=sort_mode, limit=fetch_limit)
            if not songs:
                console.print("[bold yellow]No songs found. Try a different query.[/bold yellow]")
                if mode == "Search Song":
                    query = _ask_or_cancel(questionary.text("Search new query:")) or query
                    continue
                break

            while True:
                pick = pick_song(songs, allow_load_more=True)

                if pick == PICK_ACTION_QUIT:
                    show_closing()
                    return

                if pick == PICK_ACTION_NEW_QUERY:
                    if mode == "Search Song":
                        new_query = _ask_or_cancel(questionary.text("Search new query:"))
                    else:
                        new_query = build_genre_mood_query()

                    if not new_query:
                        console.print("[yellow]No query entered. Keeping current query.[/yellow]")
                        continue

                    query = new_query
                    idx = None
                    break

                if pick == PICK_ACTION_LOAD_MORE:
                    if fetch_limit >= 200:
                        console.print("[yellow]Reached max search window. No more songs to load.[/yellow]")
                        continue

                    previous_count = len(songs)
                    fetch_limit += 25
                    expanded = search_youtube(query, allow_mixes=allow_mixes, sort_mode=sort_mode, limit=fetch_limit)

                    if len(expanded) <= previous_count:
                        console.print("[yellow]No more unique songs found for this query.[/yellow]")
                        continue

                    songs = expanded
                    console.print(
                        f"[bold cyan]Loaded {len(songs) - previous_count} more songs ({len(songs)} total).[/bold cyan]"
                    )
                    continue

                idx = pick
                break

            if idx is not None:
                break

        if idx is None:
            continue

        result = run_playlist(
            songs,
            start_index=idx,
        )
        if result == ACTION_QUIT:
            show_closing()
            break


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        show_closing()