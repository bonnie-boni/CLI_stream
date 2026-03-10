import yt_dlp
import mpv

def get_audio_stream(url):

    ydl_opts = {
        "format": "bestaudio",
        "quiet": True
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    return info["url"]

# PLAYER

player = mpv.MPV()

def play_stream(stream_url):
    player.play(stream_url)
    input("Playing... press Enter to stop")


stream_url = get_audio_stream(url)

play_stream(stream_url)


# SEARCH
def search_song(query):

    with yt_dlp.YoutubeDL({"quiet": True}) as ydl:
        info = ydl.extract_info(f"ytsearch5:{query}", download=False)
        print(info)

    return info["entries"]