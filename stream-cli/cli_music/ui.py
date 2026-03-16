from rich import box
from rich.console import Console
from rich.panel import Panel

console = Console()


def fmt_time(seconds):
    """Format seconds into mm:ss for UI display."""
    s = max(0, int(seconds))
    return f"{s // 60:02d}:{s % 60:02d}"


def render_player(
    title,
    elapsed,
    duration,
    paused=False,
    repeat=False,
    track_num=0,
    total_tracks=0,
    status_message=None,
    next_title=None,
):
    """Render rich now-playing panel with progress and controls."""
    width = 42
    if duration > 0:
        elapsed = min(elapsed, duration)
        ratio = min(elapsed / duration, 1.0)
    else:
        ratio = 0

    filled = int(width * ratio)
    bar = "█" * filled + "░" * (width - filled)

    state_tag = "  [bold red]PAUSED[/bold red]" if paused else ""
    repeat_tag = "  [bold green]REPEAT[/bold green]" if repeat else ""
    counter_tag = ""
    if total_tracks > 0:
        played = max(0, track_num - 1)
        remaining = total_tracks - track_num
        counter_tag = (
            f"  [dim]Track {track_num}/{total_tracks}[/dim]  "
            f"[dim green]Played {played}[/dim green]  "
            f"[dim yellow]Remaining {remaining}[/dim yellow]"
        )

    body = (
        f"\n  [bold white]{title}[/bold white]{state_tag}{repeat_tag}\n\n"
        + (f"  {counter_tag}\n" if counter_tag else "")
        + (f"\n  [italic cyan]{status_message}[/italic cyan]\n" if status_message else "\n")
        + f"  [cyan]{bar}[/cyan]\n"
        + f"  [dim]{fmt_time(elapsed)}[/dim]"
        + " " * (width - 1)
        + f"[dim]{fmt_time(duration)}[/dim]\n\n"
        + "  [bold yellow]Controls:[/bold yellow]\n\n"
        + "  [bold yellow][N][/bold yellow] Next  [bold yellow][P][/bold yellow] Prev  "
        + "[bold yellow][R][/bold yellow] Repeat  [bold yellow][Space][/bold yellow] Pause\n"
        + "  [bold yellow][L][/bold yellow] Load More  [bold yellow][S][/bold yellow] Search  "
        + "[bold yellow][D][/bold yellow] Download  [bold yellow][D+P][/bold yellow] Queue  "
        + "[bold red][Q][/bold red] Quit\n\n"
        + "  [bold yellow]Next Song:[/bold yellow]\n"
        + f"  [italic]{next_title or 'None (end of queue)'}[/italic]\n"
    )
    return Panel(body, title="[bold cyan]Now Playing[/bold cyan]", border_style="cyan", box=box.ROUNDED)


def show_closing(message="Bye, see you next time"):
    """Render goodbye panel when exiting the app."""
    console.print(
        Panel(
            f"[bold cyan]{message}[/bold cyan]",
            title="[bold white]Session Closed[/bold white]",
            border_style="cyan",
            box=box.DOUBLE,
        )
    )


def show_welcome():
    """Render the startup banner."""
    headset = (
        "\n        [cyan] ♩  ██████╗██╗     ██╗    ███╗   ███╗██╗   ██╗███████╗██╗ ██████╗  ♩ [/cyan]\n"
        "        [cyan] ♪ ██╔════╝██║     ██║    ████╗ ████║██║   ██║██╔════╝██║██╔════╝  ♪ [/cyan]\n"
        "        [cyan]   ██║     ██║     ██║    ██╔████╔██║██║   ██║███████╗██║██║         [/cyan]\n"
        "        [cyan] ♫ ██║     ██║     ██║    ██║╚██╔╝██║██║   ██║╚════██║██║██║       ♫ [/cyan]\n"
        "        [cyan]   ╚██████╗███████╗██║    ██║ ╚═╝ ██║╚██████╔╝███████║██║╚██████╗    [/cyan]\n"
        "        [cyan] ♬  ╚═════╝╚══════╝╚═╝    ╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝ ╚═════╝ ♬ [/cyan]\n\n"
        "           [italic cyan][bold]Tips 💡 : [/bold] Search with song and artist for better results.[/italic cyan]\n\n"
    )

    console.print(
        Panel(
            headset
            + "                      [italic cyan][bold]Created by bonnie-boni.\n              Follow me on GitHub! [/bold] [underline][link]https://github.com/bonnie-boni[/link][/underline]. \n\n",
            title="[bold cyan]CLI Music Player[/bold cyan]",
            border_style="cyan",
            box=box.DOUBLE_EDGE,
        )
    )
