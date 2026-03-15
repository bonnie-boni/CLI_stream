import os


def default_downloads_dir():
    """Return best-effort Downloads directory across platforms."""
    if os.environ.get("ANDROID_ROOT") or os.environ.get("ANDROID_DATA"):
        shared = "/storage/emulated/0/Download"
        if os.path.isdir(shared):
            return shared

    xdg = os.environ.get("XDG_DOWNLOAD_DIR")
    if xdg:
        xdg = xdg.replace("$HOME", os.path.expanduser("~"))
        return os.path.expanduser(xdg)

    if os.name == "nt":
        user_profile = os.environ.get("USERPROFILE") or os.path.expanduser("~")
        return os.path.join(user_profile, "Downloads")

    return os.path.join(os.path.expanduser("~"), "Downloads")


MUSIC_DIR = os.path.join(default_downloads_dir(), "music")

GENRES = [
    "Afrobeats", "Gospel", "Amapiano", "Pop", "Rock", "Hip Hop", "R&B", "Reggae", "EDM",
    "Jazz", "Country", "Classical", "Soul", "Salsa", "Custom",
]

MOODS = [
    "Happy", "Chill", "Hype", "Motivated", "Romantic", "Sad", "Focus", "Workout",
    "Party", "Worship", "Calm", "Custom",
]

MIX_KEYWORDS = [
    " mix", "mixtape", "playlist", "hour", "hours", "dj set", "non stop",
    "continuous", "best of", "compilation", "megamix",
]

ACTION_NEXT = "next"
ACTION_PREV = "prev"
ACTION_QUIT = "quit"
ACTION_SEARCH = "search"
ACTION_DOWNLOAD_PLAYLIST = "download_playlist"

LOAD_MORE_CHOICE = " [ Load more Songs ]"
SEARCH_NEW_QUERY_CHOICE = " [ Search New Query ]"
QUIT_CHOICE = " [ Quit ]"

PICK_ACTION_LOAD_MORE = "pick_load_more"
PICK_ACTION_NEW_QUERY = "pick_new_query"
PICK_ACTION_QUIT = "pick_quit"
