import yt_dlp
import os

def song_exists(title):
    path = f"music/{title}.mp3"
    return os.path.exists(path)

def download_song(query):

    url = f"ytsearch5:{query}"

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": "music/%(title)s.%(ext)s",
        "quiet": True,
        "noplaylist": True,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192",
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        if song_exists(query):
            print("song already exists.")
            return
        else:
            print("downloading ...")
            ydl.download([url])
            print("download complete.")

download_song(input("search: "))