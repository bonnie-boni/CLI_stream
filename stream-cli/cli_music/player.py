import os
import shutil
import subprocess
import threading
import time

import psutil

from .constants import ACTION_DOWNLOAD_PLAYLIST, ACTION_NEXT, ACTION_PREV, ACTION_QUIT, ACTION_SEARCH
from .keyboard import KeyboardPoller
from .ui import render_player

_ACTIVE_PROC = None
_ACTIVE_PROC_LOCK = threading.Lock()


def find_player():
    """Locate supported local player executable."""
    if os.name == "nt":
        mpv_candidates = [
            shutil.which("mpv"),
            r"C:\Users\User\AppData\Local\Microsoft\WindowsApps\mpv.exe",
            r"C:\Program Files\mpv\mpv.exe",
            r"C:\Program Files (x86)\mpv\mpv.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Programs\mpv\mpv.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\mpv\mpv.exe"),
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WindowsApps\mpv.exe"),
            os.path.expandvars(r"%USERPROFILE%\scoop\apps\mpv\current\mpv.exe"),
        ]
        for path in mpv_candidates:
            if path and os.path.isfile(path):
                return "mpv", path

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
