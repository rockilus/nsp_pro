from typing import Callable, List


class EventManager:
    def __init__(self):
        self.listeners: List[Callable[[dict], None]] = []
        print("EventManager created")

    def subscribe(self, listener: Callable[[dict], None]):
        """Add a listener that will be notified of new events."""
        print("subscribed")
        self.listeners.append(listener)

    def broadcast(self, data: dict):
        """Notify all listeners with the provided data."""
        print("broadcasting")
        for listener in self.listeners:
            listener(data)


# Create a single instance to be shared across the app
event_manager = EventManager()
