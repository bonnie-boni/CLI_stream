import os
import pathlib
import shutil
import subprocess
import threading
import time
import urllib.request
import zipfile

import psutil

from .constants import ACTION_DOWNLOAD_PLAYLIST, ACTION_NEXT, ACTION_PREV, ACTION_QUIT, ACTION_SEARCH
from .keyboard import KeyboardPoller
from .ui import render_player

_ACTIVE_PROC = None
_ACTIVE_PROC_LOCK = threading.Lock()
_FFMPEG_RELEASE_URL = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"


def _existing_file(paths):
    for path in paths:
        if path and os.path.isfile(path):
            return path
    return None


def _where_exe(name):
    """Resolve an executable via where.exe on Windows even when shutil.which misses it."""
    if os.name != "nt":
        return None

    try:
        result = subprocess.run(
            ["where", name],
            capture_output=True,
            text=True,
            check=False,
        )
    except Exception:
        return None

    if result.returncode != 0:
        return None

    for line in result.stdout.splitlines():
        candidate = line.strip()
        if candidate and os.path.isfile(candidate):
            return candidate
    return None


def _portable_runtime_dir():
    """Return app-local runtime tools directory."""
    if os.name == "nt":
        base = os.environ.get("LOCALAPPDATA") or os.path.join(os.path.expanduser("~"), "AppData", "Local")
    else:
        base = os.path.join(os.path.expanduser("~"), ".local", "share")
    return os.path.join(base, "cli-music", "runtime")


def _extract_first_matching(zip_path, suffix):
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.namelist():
            if member.lower().endswith(suffix.lower()):
                dest = os.path.join(_portable_runtime_dir(), os.path.basename(member))
                pathlib.Path(_portable_runtime_dir()).mkdir(parents=True, exist_ok=True)
                with zf.open(member) as src, open(dest, "wb") as dst:
                    shutil.copyfileobj(src, dst)
                return dest
    return None


def _ensure_portable_ffplay_windows():
    """Best-effort bootstrap of a portable ffplay.exe for self-contained playback on Windows."""
    if os.name != "nt":
        return None

    runtime_dir = _portable_runtime_dir()
    ffplay_path = os.path.join(runtime_dir, "ffplay.exe")
    if os.path.isfile(ffplay_path):
        return ffplay_path

    try:
        pathlib.Path(runtime_dir).mkdir(parents=True, exist_ok=True)
        zip_path = os.path.join(runtime_dir, "ffmpeg-release-essentials.zip")
        with urllib.request.urlopen(_FFMPEG_RELEASE_URL, timeout=45) as response, open(zip_path, "wb") as out:
            shutil.copyfileobj(response, out)

        extracted = _extract_first_matching(zip_path, "bin/ffplay.exe")
        try:
            os.remove(zip_path)
        except OSError:
            pass
        return extracted if extracted and os.path.isfile(extracted) else None
    except Exception:
        return None


def find_player():
    """Locate supported local player executable."""
    if os.name == "nt":
        user_profile = os.environ.get("USERPROFILE") or os.path.expanduser("~")
        local_app_data = os.environ.get("LOCALAPPDATA") or os.path.join(user_profile, "AppData", "Local")
        program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")
        chocolatey = os.environ.get("ChocolateyInstall", r"C:\ProgramData\chocolatey")

        mpv_path = _existing_file([
            shutil.which("mpv"),
            _where_exe("mpv.exe"),
            r"C:\Users\User\AppData\Local\Microsoft\WindowsApps\mpv.exe",
            os.path.join(program_files, "mpv", "mpv.exe"),
            os.path.join(program_files_x86, "mpv", "mpv.exe"),
            os.path.join(local_app_data, "Programs", "mpv", "mpv.exe"),
            os.path.join(local_app_data, "mpv", "mpv.exe"),
            os.path.join(local_app_data, "Microsoft", "WindowsApps", "mpv.exe"),
            os.path.join(user_profile, "scoop", "apps", "mpv", "current", "mpv.exe"),
            os.path.join(chocolatey, "bin", "mpv.exe"),
        ])
        if mpv_path:
            return "mpv", mpv_path

        vlc_path = _existing_file([
            shutil.which("vlc"),
            _where_exe("vlc.exe"),
            os.path.join(program_files, "VideoLAN", "VLC", "vlc.exe"),
            os.path.join(program_files_x86, "VideoLAN", "VLC", "vlc.exe"),
            os.path.join(local_app_data, "Programs", "VideoLAN", "VLC", "vlc.exe"),
            os.path.join(chocolatey, "bin", "vlc.exe"),
        ])
        if vlc_path:
            return "vlc", vlc_path

        ffplay_path = _existing_file([
            shutil.which("ffplay"),
            _where_exe("ffplay.exe"),
            os.path.join(program_files, "ffmpeg", "bin", "ffplay.exe"),
            os.path.join(program_files_x86, "ffmpeg", "bin", "ffplay.exe"),
            os.path.join(local_app_data, "Programs", "ffmpeg", "bin", "ffplay.exe"),
            os.path.join(user_profile, "scoop", "apps", "ffmpeg", "current", "bin", "ffplay.exe"),
            os.path.join(chocolatey, "bin", "ffplay.exe"),
            os.path.join(chocolatey, "lib", "ffmpeg", "tools", "ffmpeg", "bin", "ffplay.exe"),
        ])
        if ffplay_path:
            return "ffplay", ffplay_path

        # Self-contained fallback: bootstrap portable ffplay into LocalAppData.
        portable_ffplay = _ensure_portable_ffplay_windows()
        if portable_ffplay:
            return "ffplay", portable_ffplay

    for player in ["mpv", "vlc", "ffplay"]:
        path = shutil.which(player)
        if path:
            return player, path

    return None, None


def kill_process_tree(proc):
    if not proc or proc.poll() is not None:
        return

    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        else:
            proc.terminate()
        proc.wait(timeout=1.5)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


def register_active_proc(proc):
    global _ACTIVE_PROC
    with _ACTIVE_PROC_LOCK:
        _ACTIVE_PROC = proc


def clear_active_proc(proc=None):
    global _ACTIVE_PROC
    with _ACTIVE_PROC_LOCK:
        if proc is None or _ACTIVE_PROC is proc:
            _ACTIVE_PROC = None


def stop_active_playback():
    global _ACTIVE_PROC
    with _ACTIVE_PROC_LOCK:
        proc = _ACTIVE_PROC
        _ACTIVE_PROC = None
    kill_process_tree(proc)


def pause_proc(proc):
    try:
        root = psutil.Process(proc.pid)
        children = root.children(recursive=True)
        for child in children:
            try:
                child.suspend()
            except Exception:
                continue
        root.suspend()
    except Exception:
        pass


def resume_proc(proc):
    try:
        root = psutil.Process(proc.pid)
        children = root.children(recursive=True)
        root.resume()
        for child in children:
            try:
                child.resume()
            except Exception:
                continue
    except Exception:
        pass


def play_song(
    stream_url,
    title,
    duration,
    player_name,
    player_path,
    live,
    track_num=0,
    total_tracks=0,
    status_ref=None,
    repeat_ref=None,
    on_download_song=None,
    on_load_more=None,
    next_title_ref=None,
):
    """Play one song and return user action."""
    stop_active_playback()

    if player_name == "mpv":
        cmd = [player_path, "--no-video", "--really-quiet", "--input-terminal=no", stream_url]
    elif player_name == "vlc":
        cmd = [player_path, "--intf", "dummy", "--no-video", "--quiet", stream_url]
    else:
        cmd = [player_path, "-nodisp", "-autoexit", "-loglevel", "quiet", "-hide_banner", stream_url]

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    register_active_proc(proc)

    action = [None]
    paused = [False]
    elapsed_accum = [0.0]
    segment_start = [time.time()]

    def key_listener():
        with KeyboardPoller() as keyboard:
            while proc.poll() is None and action[0] is None:
                if keyboard.kbhit():
                    key = keyboard.getch()
                    upper = key.upper()

                    if key == b" ":
                        if paused[0]:
                            paused[0] = False
                            segment_start[0] = time.time()
                            resume_proc(proc)
                        else:
                            elapsed_accum[0] += time.time() - segment_start[0]
                            paused[0] = True
                            pause_proc(proc)

                    elif upper == b"D":
                        deadline = time.time() + 0.45
                        download_playlist = False
                        while time.time() < deadline:
                            if keyboard.kbhit():
                                nxt = keyboard.getch().upper()
                                if nxt == b"P":
                                    download_playlist = True
                                break
                            time.sleep(0.02)
                        if download_playlist:
                            action[0] = ACTION_DOWNLOAD_PLAYLIST
                        elif callable(on_download_song):
                            on_download_song()

                    elif upper == b"N":
                        action[0] = ACTION_NEXT
                    elif upper == b"P":
                        action[0] = ACTION_PREV
                    elif upper == b"L":
                        if callable(on_load_more):
                            on_load_more()
                    elif upper == b"R":
                        if repeat_ref is not None:
                            repeat_ref[0] = not repeat_ref[0]
                    elif upper == b"Q":
                        action[0] = ACTION_QUIT
                    elif upper == b"S":
                        action[0] = ACTION_SEARCH

                    if action[0]:
                        if paused[0]:
                            resume_proc(proc)
                        kill_process_tree(proc)
                        return
                time.sleep(0.04)

    threading.Thread(target=key_listener, daemon=True).start()

    while proc.poll() is None and action[0] is None:
        if paused[0]:
            elapsed = elapsed_accum[0]
        else:
            elapsed = elapsed_accum[0] + (time.time() - segment_start[0])

        live.update(
            render_player(
                title,
                elapsed,
                duration or 0,
                paused=paused[0],
                repeat=repeat_ref[0] if repeat_ref else False,
                track_num=track_num,
                total_tracks=total_tracks,
                status_message=status_ref[0] if status_ref else None,
                next_title=next_title_ref[0] if next_title_ref else None,
            )
        )
        time.sleep(0.25)

    if action[0] is not None:
        if paused[0]:
            resume_proc(proc)
        kill_process_tree(proc)
    try:
        proc.wait(timeout=2)
    except Exception:
        kill_process_tree(proc)
    clear_active_proc(proc)
    return action[0]
