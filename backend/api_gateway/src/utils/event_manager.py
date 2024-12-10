from typing import Callable, List


class EventManager:
    def __init__(self) -> None:
        self.listeners: List[Callable[[dict], None]] = []

    def subscribe(self, listener: Callable[[dict], None]) -> None:
        """Add a listener that will be notified of new events."""
        self.listeners.append(listener)

    def broadcast(self, data: dict) -> None:
        """Notify all listeners with the provided data."""
        for listener in self.listeners:
            listener(data)


# Create a single instance to be shared across the app
event_manager = EventManager()
