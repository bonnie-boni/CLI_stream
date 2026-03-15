def ask_or_cancel(prompt):
    """Run a questionary prompt and treat cancellation as graceful exit."""
    value = prompt.ask()
    if value is None:
        raise KeyboardInterrupt
    return value
