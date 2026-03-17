import re

import questionary
import yt_dlp

from .auth import base_opts
from .constants import GENRES, MIX_KEYWORDS, MOODS
from .net import fallback_message
from .prompts import ask_or_cancel
from .ui import console


def parse_year(entry):
    date = entry.get("upload_date") or ""
    if len(date) >= 4 and date[:4].isdigit():
        return int(date[:4])
    text = entry.get("title") or ""
    match = re.search(r"\b(19\d{2}|20\d{2})\b", text)
    return int(match.group(1)) if match else 0


def is_music_candidate(entry, allow_mixes):
    title = (entry.get("title") or "").lower()
    duration = entry.get("duration") or 0

    duration_ok = duration == 0 or 60 <= duration <= 9 * 60
    if not duration_ok:
        return False

    if not allow_mixes and any(k in title for k in MIX_KEYWORDS):
        return False

    return True


def sort_entries(entries, sort_mode):
    if sort_mode == "Newest":
        return sorted(entries, key=parse_year, reverse=True)
    if sort_mode == "Oldest":
        return sorted(entries, key=lambda e: (parse_year(e) == 0, parse_year(e)))
    return entries


def entry_key(entry):
    return (entry.get("id") or entry.get("webpage_url") or entry.get("title") or "").strip().lower()


def normalize_text(text):
    value = (text or "").lower()
    value = re.sub(r"\(.*?\)|\[.*?\]", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def artist_name(entry):
    for field in ("artist", "uploader", "creator", "channel"):
        value = (entry.get(field) or "").strip()
        if value:
            return value
    return ""


def title_artist_key(entry):
    title = normalize_text(entry.get("track") or entry.get("title") or "")
    artist = normalize_text(artist_name(entry))
    if title and artist:
        return f"{title}::{artist}"
    if title:
        return title
    return entry_key(entry)


def dedupe_entries(entries):
    seen = set()
    unique = []
    for entry in entries:
        key = title_artist_key(entry)
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        unique.append(entry)
    return unique


def search_youtube(query, allow_mixes=False, sort_mode="Relevance", limit=25, quiet=False):
    """Search YouTube and return filtered and deduplicated entries."""
    limit = max(1, min(int(limit), 200))
    smart_query = f"{query} official audio"

    try:
        if quiet:
            with yt_dlp.YoutubeDL(base_opts(ignore_errors=True)) as ydl:
                results = ydl.extract_info(f"ytsearch{limit}:{smart_query}", download=False)
        else:
            with console.status(f"[bold cyan]Searching [italic]{smart_query}[/italic]...", spinner="dots"):
                with yt_dlp.YoutubeDL(base_opts(ignore_errors=True)) as ydl:
                    results = ydl.extract_info(f"ytsearch{limit}:{smart_query}", download=False)
    except Exception as exc:
        if not quiet:
            console.print(f"[yellow]{fallback_message('search songs', exc)}[/yellow]")
        return []

    raw_entries = [e for e in (results.get("entries") or []) if e]
    filtered = [e for e in raw_entries if is_music_candidate(e, allow_mixes)]
    if not filtered:
        filtered = raw_entries

    return dedupe_entries(sort_entries(filtered, sort_mode))


def build_genre_mood_query():
    genre = ask_or_cancel(questionary.select("Genre:", choices=GENRES))
    if genre == "Custom":
        genre = ask_or_cancel(questionary.text("Type genre:"))

    mood = ask_or_cancel(questionary.select("Mood:", choices=MOODS))
    if mood == "Custom":
        mood = ask_or_cancel(questionary.text("Type mood:"))

    return f"{genre} {mood} songs"


def normalize_url_entry(entry):
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
        "thumbnail": entry.get("thumbnail") or "",
        "upload_date": entry.get("upload_date") or "",
        "webpage_url": video_url,
        "artist": entry.get("artist") or "",
        "uploader": entry.get("uploader") or "",
        "creator": entry.get("creator") or "",
        "channel": entry.get("channel") or "",
    }


def load_from_youtube_url(url):
    """Load songs from a YouTube playlist/video URL with fallback messaging."""
    try:
        with console.status("[bold cyan]Loading songs from URL...[/bold cyan]", spinner="dots"):
            with yt_dlp.YoutubeDL(base_opts(ignore_errors=True)) as ydl:
                info = ydl.extract_info(url, download=False)
    except Exception as exc:
        console.print(f"[yellow]{fallback_message('load songs from URL', exc)}[/yellow]")
        return [], ""

    if not info:
        return [], ""

    entries = info.get("entries") or [info]
    songs = []
    for entry in entries:
        if not entry:
            continue
        song = normalize_url_entry(entry)
        if song.get("webpage_url"):
            songs.append(song)

    songs = dedupe_entries(songs)
    return songs, info.get("title") or "Custom URL"


def extract_primary_artist(song):
    artist = artist_name(song)
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
