import asyncio
from typing import Callable

from fastapi import APIRouter, Response
from utils import event_manager
from starlette.responses import StreamingResponse
import json

router = APIRouter()


@router.get("/sse", response_class=Response)
async def sse() -> Callable:
    print("sse route hit")

    async def event_stream():
        queue = asyncio.Queue()

        def send_event(data: dict):
            """Listener function to send events to the queue."""
            print("sending event")
            queue.put_nowait(data)

        # Subscribe to the EventManager
        event_manager.subscribe(send_event)

        try:
            while True:
                print("waiting for data")
                data = await queue.get()
                # yield f"data: {data}\n\n"
                yield f"data: {json.dumps(data)}\n\n"

        finally:
            # Unsubscribe the listener when the connection is closed
            print("unsubscribing")
            event_manager.listeners.remove(send_event)

    print("returning response")
    # return Response(event_stream(), media_type="text/event-stream")
    return StreamingResponse(event_stream(), media_type="text/event-stream")
