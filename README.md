# CLI Music Player

A terminal-based music player that searches YouTube, streams audio, and supports downloads.

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

## Requirements

- Python 3.10+
- One installed audio player:
  - mpv (recommended)
  - VLC
  - ffplay (from ffmpeg)

## Install

1. Create and activate a virtual environment (optional but recommended).
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Run

From the project root:

```bash
python cli/stream.py
```

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

- Song downloads are stored in the `music/` directory.
- Audio is converted to MP3 at 192 kbps using ffmpeg post-processing.

## Notes

- The app attempts to read browser cookies for better YouTube access.
- Duplicate entries are filtered using normalized title + artist/uploader fields.
- Only one playback process is allowed at a time; the current song is terminated before next/previous playback starts.

## Troubleshooting

- If no audio plays, ensure mpv/VLC/ffplay is installed and available on PATH.
- If imports fail in editor diagnostics, install dependencies from `requirements.txt` in the active Python environment.
