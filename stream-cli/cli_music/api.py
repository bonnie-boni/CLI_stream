from __future__ import annotations

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/songs/search")
def search_songs(
    q: str,
    allow_mixes: bool = False,
    sort_mode: str = "Relevance",
    limit: int = 25,
) -> dict[str, Any]:
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    entries = search_youtube(
        q,
        allow_mixes=allow_mixes,
        sort_mode=sort_mode,
        limit=limit,
        quiet=True,
    )

    songs = [_to_song_payload(entry) for entry in entries if (entry.get("webpage_url") or entry.get("id"))]
    return {"query": q, "count": len(songs), "songs": songs}


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
