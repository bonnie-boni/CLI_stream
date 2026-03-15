import threading

import questionary
import yt_dlp
from rich.live import Live

from .constants import (
    ACTION_DOWNLOAD_PLAYLIST,
    ACTION_NEXT,
    ACTION_PREV,
    ACTION_QUIT,
    ACTION_SEARCH,
    LOAD_MORE_CHOICE,
    PICK_ACTION_LOAD_MORE,
    PICK_ACTION_NEW_QUERY,
    PICK_ACTION_QUIT,
    QUIT_CHOICE,
    SEARCH_NEW_QUERY_CHOICE,
)
from .downloads import download_playlist_songs, ydl_download_opts
from .net import fallback_message
from .player import find_player, play_song, stop_active_playback
from .prompts import ask_or_cancel
from .search import (
    artist_name,
    extract_primary_artist,
    parse_year,
    search_youtube,
    title_artist_key,
)
from .streaming import get_stream_url
from .ui import console, fmt_time


def entry_label(song):
    year = parse_year(song)
    y = str(year) if year else "----"
    dur = fmt_time(song.get("duration") or 0)
    artist = artist_name(song)
    title = song["title"]
    if artist and artist.lower() not in title.lower():
        title = f"{title} - {artist}"
    return f"{title}  [{y}]  ({dur})"


def pick_song(songs, allow_load_more=False):
    labels = [entry_label(s) for s in songs]
    if allow_load_more:
        labels.append(LOAD_MORE_CHOICE)
        labels.append(SEARCH_NEW_QUERY_CHOICE)
        labels.append(QUIT_CHOICE)
    choice = ask_or_cancel(questionary.select("Pick a song:", choices=labels))
    if allow_load_more and choice == LOAD_MORE_CHOICE:
        return PICK_ACTION_LOAD_MORE
    if allow_load_more and choice == SEARCH_NEW_QUERY_CHOICE:
        return PICK_ACTION_NEW_QUERY
    if allow_load_more and choice == QUIT_CHOICE:
        return PICK_ACTION_QUIT
    return labels.index(choice)


class ArtistQueueLoader:
    _SEARCH_SEEDS = ["{artist} songs", "{artist} music", "{artist} best songs"]
    BATCH_SIZE = 25

    def __init__(self, seed_song, allow_mixes=False, sort_mode="Relevance"):
        self.seed_song = seed_song
        self.allow_mixes = allow_mixes
        self.sort_mode = sort_mode
        self._lock = threading.Lock()
        self._songs = [seed_song]
        self._artist = ""
        self.done = threading.Event()

    def start(self):
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self):
        try:
            artist = extract_primary_artist(self.seed_song)
            if not artist:
                return
            with self._lock:
                self._artist = artist

            seen = {title_artist_key(self.seed_song)}
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

                new_songs = [e for e in results if title_artist_key(e) not in seen]
                for e in new_songs:
                    seen.add(title_artist_key(e))
                if new_songs:
                    with self._lock:
                        self._songs.extend(new_songs)
        finally:
            self.done.set()

    def snapshot(self):
        with self._lock:
            return list(self._songs), self._artist

    def loaded_count(self):
        with self._lock:
            return len(self._songs)


def run_playlist(songs, start_index=0, auto_artist_playlist=False, allow_mixes=False, sort_mode="Relevance"):
    player_name, player_path = find_player()
    if not player_name:
        console.print("[bold red]No audio player found. Install mpv, VLC, or ffplay.[/bold red]")
        return ACTION_SEARCH

    songs = list(songs)
    idx = start_index
    songs_lock = threading.Lock()

    status_ref = [None]
    repeat_ref = [False]

    prefetch_lock = threading.Lock()
    prefetch_state = {"ready_url": None, "payload": None, "loading_url": None}

    download_lock = threading.Lock()
    queued_download_urls = set()
    load_more_lock = threading.Lock()
    load_more_state = {"loading": False}

    def queue_song_download(song):
        song_url = song.get("webpage_url")
        if not song_url:
            return

        with download_lock:
            if song_url in queued_download_urls:
                status_ref[0] = "Download already queued"
                return
            queued_download_urls.add(song_url)

        status_ref[0] = f"Download queued: {song.get('title', 'Unknown')}"

        def download_worker():
            try:
                with yt_dlp.YoutubeDL(ydl_download_opts()) as ydl:
                    ydl.download([song_url])
                status_ref[0] = f"Download complete: {song.get('title', 'Unknown')}"
            except Exception as exc:
                status_ref[0] = fallback_message("download this song", exc)

        threading.Thread(target=download_worker, daemon=True).start()

    def queue_artist_load_more(seed_song, current_index=None, next_title_ref=None):
        artist = extract_primary_artist(seed_song)
        if not artist:
            status_ref[0] = "No artist metadata found for load more"
            return

        with load_more_lock:
            if load_more_state["loading"]:
                status_ref[0] = "Load more already running"
                return
            load_more_state["loading"] = True

        status_ref[0] = f"Loading more from {artist}..."

        def load_more_worker():
            try:
                results = search_youtube(
                    f"{artist} songs",
                    allow_mixes=allow_mixes,
                    sort_mode=sort_mode,
                    limit=50,
                    quiet=True,
                )
                with songs_lock:
                    seen = {title_artist_key(e) for e in songs}
                    additions = [e for e in results if title_artist_key(e) not in seen]
                    if additions:
                        songs.extend(additions)
                    if next_title_ref is not None and current_index is not None and current_index + 1 < len(songs):
                        next_title_ref[0] = songs[current_index + 1].get("title") or "Unknown"

                if additions:
                    status_ref[0] = f"Added {len(additions)} songs from {artist}"
                else:
                    status_ref[0] = f"No new songs found for {artist}"
            except Exception as exc:
                status_ref[0] = fallback_message("load more songs", exc)
            finally:
                with load_more_lock:
                    load_more_state["loading"] = False

        threading.Thread(target=load_more_worker, daemon=True).start()

    def start_prefetch(next_song):
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

        def prefetch_worker(target_url):
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

        threading.Thread(target=prefetch_worker, args=(next_url,), daemon=True).start()

    loader = None
    if auto_artist_playlist and songs:
        loader = ArtistQueueLoader(songs[start_index], allow_mixes=allow_mixes, sort_mode=sort_mode)
        loader.start()
        total_expected = loader.BATCH_SIZE * len(loader._SEARCH_SEEDS)

        def monitor_status():
            while not loader.done.wait(timeout=0.4):
                artist_songs = loader.loaded_count() - 1
                status_ref[0] = f"Building artist queue... {artist_songs}/{total_expected} songs"
            _, artist = loader.snapshot()
            final_count = loader.loaded_count() - 1
            if artist and final_count > 0:
                status_ref[0] = f"Queue ready: {artist} with {final_count} songs"
            else:
                status_ref[0] = None

        threading.Thread(target=monitor_status, daemon=True).start()

    with Live(console=console, refresh_per_second=4) as live:
        while True:
            with songs_lock:
                total = len(songs)
                if not (0 <= idx < total):
                    break

            if loader is not None:
                live_queue, _ = loader.snapshot()
                if len(live_queue) > total:
                    with songs_lock:
                        songs = live_queue
                        total = len(songs)

            with songs_lock:
                song = songs[idx]
                total = len(songs)
                next_title_ref = [(songs[idx + 1].get("title") or "Unknown") if idx + 1 < len(songs) else None]

            track_num = idx + 1
            song_url = song.get("webpage_url")

            try:
                with prefetch_lock:
                    cached_payload = prefetch_state["payload"] if prefetch_state["ready_url"] == song_url else None

                if cached_payload is not None:
                    stream_url, title, duration = cached_payload
                else:
                    stream_url, title, duration = get_stream_url(song_url)
            except Exception as exc:
                console.print(f"[yellow]{fallback_message('open this song', exc)}[/yellow]")
                idx += 1
                continue

            if idx + 1 < total:
                with songs_lock:
                    next_song = songs[idx + 1] if idx + 1 < len(songs) else None
                start_prefetch(next_song)

            action = play_song(
                stream_url,
                title,
                duration,
                player_name,
                player_path,
                live,
                track_num=track_num,
                total_tracks=total,
                status_ref=status_ref,
                repeat_ref=repeat_ref,
                on_download_song=lambda s=song: queue_song_download(s),
                on_load_more=lambda s=song, i=idx, ntr=next_title_ref: queue_artist_load_more(s, i, ntr),
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
                idx = idx
            else:
                idx += 1

    stop_active_playback()
    return ACTION_SEARCH


__all__ = ["run_playlist", "pick_song", "ArtistQueueLoader"]
