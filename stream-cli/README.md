# CLI Music Player

A terminal-based music player that searches and streams audio, and supports downloads.

## Requirements

- Python 3.10+
- pip or uv
- An internet connection
- Optional local audio player: mpv, VLC, or ffplay

On Windows, if no player is found, CLI Music will automatically bootstrap a
portable `ffplay.exe` backend into your local app runtime folder.

## Install

Install from your preferred package channel:

```bash
pip install cli-music
```
or
```bash
uv pip install cli-music
```
or
```bash
winget install cli-music
```
or (Debian/Ubuntu after repository setup)
```bash
sudo apt update
sudo apt install cli-music
```

## Run
Just run the command from your terminal

```bash
cli-music
```

# Updating
Just run the command from your terminal

```bash
pip install --upgrade cli-music
```

## Features

- Search songs by free text query.
- Discover songs by genre + mood.
- Load more results for the same query in batches.
- Play from a pasted YouTube URL (playlist or single video).
- De-duplicate songs by normalized title + artist/uploader.
- Keyboard controls during playback:
  - N: Next song
  - P: Previous song
  - Q: Quit player
  - S: Back to search/mode selection
  - D: Download current song
  - D then P quickly: Download all songs in current queue

## Modes

1. Search Song
   - Enter any query.
   - Optionally include mixes/playlists.
   - Optionally sort by year.
   - Use "[ Load more results ]" in picker to fetch more songs.

2. Discover by Genre + Mood
   - Pick genre and mood, then proceed the same way as Search Song.

3. Play from YouTube URL
   - Paste a YouTube playlist URL or a single video URL.
   - Songs are loaded directly.
   - This mode skips query/mood/sort prompts.

## Downloads

- Song downloads are stored in the `Downloads/music/` directory.

## API for Mobile App

You can run the CLI Music backend as an HTTP API for the React Native app.

Start the API server:

```bash
cli-music-api --host 0.0.0.0 --port 8765
```

Available endpoints:

- `GET /health`
- `GET /songs/search?q=<query>&limit=25`
- `POST /songs/download` with JSON body:
   - `id` (optional)
   - `title`
   - `webpage_url`

For physical devices, set `EXPO_PUBLIC_API_BASE_URL` in the mobile app to your PC IP, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:8765
```
