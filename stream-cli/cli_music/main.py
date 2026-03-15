import questionary

from .auth import browser_name, setup_auth
from .constants import (
    ACTION_QUIT,
    PICK_ACTION_LOAD_MORE,
    PICK_ACTION_NEW_QUERY,
    PICK_ACTION_QUIT,
)
from .playlist import pick_song, run_playlist
from .prompts import ask_or_cancel
from .search import build_genre_mood_query, load_from_youtube_url, search_youtube
from .ui import console, show_closing, show_welcome


def main():
    """Run CLI interaction loop for search, playlist loading, and playback."""
    setup_auth()
    if browser_name():
        console.print(f"[bold green]Auth ready using browser cookies: {browser_name()}[/bold green]")
    else:
        console.print("[bold yellow]Auth ready (no browser cookies found).[/bold yellow]")

    show_welcome()

    while True:
        mode = ask_or_cancel(
            questionary.select(
                "Choose mode:",
                choices=["Search Song", "Discover by Genre + Mood", "Play from YouTube URL", "Quit"],
            )
        )

        if mode == "Quit":
            show_closing()
            break

        if mode == "Play from YouTube URL":
            url = ask_or_cancel(questionary.text("Paste YouTube URL (playlist or video):"))
            if not url:
                console.print("[yellow]No URL provided.[/yellow]")
                continue

            songs, source_label = load_from_youtube_url(url)
            if not songs:
                console.print("[bold yellow]No songs found from this URL.[/bold yellow]")
                continue

            console.print(f"[bold cyan]Loaded {len(songs)} songs from: {source_label}[/bold cyan]")
            idx = pick_song(songs, allow_load_more=False)
            result = run_playlist(songs, start_index=idx)
            if result == ACTION_QUIT:
                show_closing()
                break
            continue

        allow_mixes = ask_or_cancel(questionary.confirm("Include mixes/playlists?", default=False))
        sort_mode = ask_or_cancel(questionary.select("Sort by year:", choices=["Random", "Newest", "Oldest"]))

        if mode == "Search Song":
            query = ask_or_cancel(questionary.text("Search query:"))
        else:
            query = build_genre_mood_query()

        idx = None
        while idx is None:
            fetch_limit = 25
            songs = search_youtube(query, allow_mixes=allow_mixes, sort_mode=sort_mode, limit=fetch_limit)
            if not songs:
                console.print("[bold yellow]No songs found. Try a different query.[/bold yellow]")
                if mode == "Search Song":
                    query = ask_or_cancel(questionary.text("Search new query:")) or query
                    continue
                break

            while True:
                pick = pick_song(songs, allow_load_more=True)

                if pick == PICK_ACTION_QUIT:
                    show_closing()
                    return

                if pick == PICK_ACTION_NEW_QUERY:
                    if mode == "Search Song":
                        new_query = ask_or_cancel(questionary.text("Search new query:"))
                    else:
                        new_query = build_genre_mood_query()

                    if not new_query:
                        console.print("[yellow]No query entered. Keeping current query.[/yellow]")
                        continue

                    query = new_query
                    idx = None
                    break

                if pick == PICK_ACTION_LOAD_MORE:
                    if fetch_limit >= 200:
                        console.print("[yellow]Reached max search window. No more songs to load.[/yellow]")
                        continue

                    previous_count = len(songs)
                    fetch_limit += 25
                    expanded = search_youtube(query, allow_mixes=allow_mixes, sort_mode=sort_mode, limit=fetch_limit)

                    if len(expanded) <= previous_count:
                        console.print("[yellow]No more unique songs found for this query.[/yellow]")
                        continue

                    songs = expanded
                    console.print(
                        f"[bold cyan]Loaded {len(songs) - previous_count} more songs ({len(songs)} total).[/bold cyan]"
                    )
                    continue

                idx = pick
                break

            if idx is not None:
                break

        if idx is None:
            continue

        result = run_playlist(songs, start_index=idx)
        if result == ACTION_QUIT:
            show_closing()
            break


def run():
    """Safe entrypoint used by console scripts."""
    try:
        main()
    except KeyboardInterrupt:
        show_closing("Interrupted. Session closed cleanly")


if __name__ == "__main__":
    run()
