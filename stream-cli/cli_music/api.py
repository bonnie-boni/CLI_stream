from __future__ import annotations

import time
from typing import Any

import typer
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .constants import MUSIC_DIR
from .downloads import download_song
from .search import artist_name, search_youtube
from .streaming import get_stream_url


def _to_song_payload(entry: dict[str, Any]) -> dict[str, Any]:
    video_url = entry.get("webpage_url") or ""
    if not video_url and entry.get("id"):
        video_url = f"https://www.youtube.com/watch?v={entry['id']}"

    return {
        "id": entry.get("id") or video_url,
        "title": entry.get("title") or "Unknown",
        "artist": artist_name(entry) or "Unknown Artist",
        "duration": int(entry.get("duration") or 0),
        "webpage_url": video_url,
        "thumbnail": entry.get("thumbnail") or "",
    }


class DownloadRequest(BaseModel):
    id: str | None = None
    title: str = Field(default="Unknown")
    webpage_url: str


app = FastAPI(title="CLI Music API", version="0.1.0")

SEARCH_CACHE_TTL_SECONDS = 180
SEARCH_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
PRELOADED_QUERY = "Moji Shortbaba songs"
PRELOADED_LIMIT = 20


def _cache_key(q: str, allow_mixes: bool, sort_mode: str, limit: int) -> str:
    return f"{q.strip().lower()}|{allow_mixes}|{sort_mode.strip().lower()}|{limit}"


def _get_cached_search(key: str) -> dict[str, Any] | None:
    now = time.time()
    cached = SEARCH_CACHE.get(key)
    if not cached:
        return None

    timestamp, payload = cached
    if now - timestamp > SEARCH_CACHE_TTL_SECONDS:
        SEARCH_CACHE.pop(key, None)
        return None

    return payload


def _set_cached_search(key: str, payload: dict[str, Any]) -> None:
    SEARCH_CACHE[key] = (time.time(), payload)


def _build_search_payload(
    q: str,
    allow_mixes: bool,
    sort_mode: str,
    limit: int,
) -> dict[str, Any]:
    bounded_limit = max(1, min(limit, 50))
    key = _cache_key(q, allow_mixes, sort_mode, bounded_limit)
    cached = _get_cached_search(key)
    if cached is not None:
        return {**cached, "cached": True}

    entries = search_youtube(
        q,
        allow_mixes=allow_mixes,
        sort_mode=sort_mode,
        limit=bounded_limit,
        quiet=True,
    )

    songs = [_to_song_payload(entry) for entry in entries if (entry.get("webpage_url") or entry.get("id"))]
    payload = {"query": q, "count": len(songs), "songs": songs, "cached": False}
    _set_cached_search(key, payload)
    return payload

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
def preload_moji_shortbaba() -> None:
    # Warm cache so the first client render gets near-instant results.
    try:
        _build_search_payload(PRELOADED_QUERY, allow_mixes=False, sort_mode="Relevance", limit=PRELOADED_LIMIT)
    except Exception:
        # Keep API startup resilient even if YouTube lookup fails.
        pass


@app.get("/songs/preloaded")
def preloaded_songs() -> dict[str, Any]:
    return _build_search_payload(PRELOADED_QUERY, allow_mixes=False, sort_mode="Relevance", limit=PRELOADED_LIMIT)


@app.get("/songs/search")
def search_songs(
    q: str,
    allow_mixes: bool = False,
    sort_mode: str = "Relevance",
    limit: int = 25,
) -> dict[str, Any]:
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    return _build_search_payload(q, allow_mixes=allow_mixes, sort_mode=sort_mode, limit=limit)


@app.get("/songs/stream")
def song_stream(url: str) -> dict[str, Any]:
    if not url.strip():
        raise HTTPException(status_code=400, detail="url is required")

    try:
        stream_url, title, duration = get_stream_url(url, quiet=True)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"stream_url": stream_url, "title": title, "duration": duration}


@app.post("/songs/download")
def song_download(payload: DownloadRequest) -> dict[str, Any]:
    if not payload.webpage_url.strip():
        raise HTTPException(status_code=400, detail="webpage_url is required")

    song = {
        "id": payload.id or payload.webpage_url,
        "title": payload.title,
        "webpage_url": payload.webpage_url,
    }

    try:
        download_song(song)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "downloaded",
        "title": payload.title,
        "downloads_dir": MUSIC_DIR,
    }


def run(host: str = "0.0.0.0", port: int = 8765) -> None:
    import uvicorn

    uvicorn.run("cli_music.api:app", host=host, port=port, reload=False)


def serve(
    host: str = "0.0.0.0",
    port: int = 8765,
) -> None:
    run(host=host, port=port)


def cli() -> None:
    typer.run(serve)


if __name__ == "__main__":
    cli()
