import yt_dlp
import os

def song_exists(title):
    path = f"music/{title}.mp3"
    return os.path.exists(path)

def search_and_download(query):
    url = f"ytsearch10:{query}"

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": "music/%(title)s.%(ext)s",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        print("Searching ...")
        info = ydl.extract_info(url, download=False)
        entries = info.get("entries", [])

        print(f"\n{len(entries)} song(s) found for '{query}'.")
        for i, entry in enumerate(entries, 1):
            print(f"  {i}. {entry.get('title', 'Unknown')}")

        raw = input("\nEnter numbers to download (e.g. 1,3,5), 'all', or 'cancel': ").strip().lower()
        if raw == "cancel":
            print("Download cancelled.")
            return

        if raw == "all":
            selected = entries
        else:
            try:
                indices = [int(x.strip()) - 1 for x in raw.split(",")]
                selected = [entries[i] for i in indices if 0 <= i < len(entries)]
            except ValueError:
                print("Invalid input. Download cancelled.")
                return

        downloaded = 0
        skipped = 0
        for entry in selected:
            title = entry.get("title", "Unknown")
            if song_exists(title):
                print(f"[exists]      {title}")
                skipped += 1
            else:
                print(f"[downloading] {title} ...")
                ydl.download([entry["webpage_url"]])
                downloaded += 1

        print(f"\nDone. {downloaded} downloaded, {skipped} already existed.")

search_and_download(input("search: "))