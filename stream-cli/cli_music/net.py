import socket


def internet_available(timeout=2):
    """Best-effort internet check using public DNS endpoints."""
    hosts = [("1.1.1.1", 53), ("8.8.8.8", 53)]
    for host, port in hosts:
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except OSError:
            continue
    return False


def fallback_message(action, exc):
    """Return a user-friendly fallback message for network/extractor issues."""
    text = str(exc) if exc else ""
    lowered = text.lower()

    if not internet_available():
        return f"No internet connection while trying to {action}. Check your network and try again."

    network_tokens = ["timed out", "timeout", "temporary failure", "name resolution", "connection", "unreachable"]
    if any(token in lowered for token in network_tokens):
        return f"Network interruption while trying to {action}. Please retry in a few seconds."

    yt_tokens = ["sign in", "captcha", "cookie", "private", "forbidden", "http error 403"]
    if any(token in lowered for token in yt_tokens):
        return f"Provider access issue while trying to {action}. Try another song or refresh auth cookies."

    return f"Could not {action}. Please try again."
