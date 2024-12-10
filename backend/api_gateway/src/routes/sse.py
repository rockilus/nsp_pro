import asyncio
import json
from typing import Callable

from fastapi import APIRouter, Response
from starlette.responses import StreamingResponse

from utils import event_manager

router = APIRouter()


@router.get("/sse", response_class=Response)
async def sse() -> Callable:
    print("sse route hit")

    async def event_stream():
        queue = asyncio.Queue()

        def send_event(data: dict):
            """Listener function to send events to the queue."""
            queue.put_nowait(data)

        # Subscribe to the EventManager
        event_manager.subscribe(send_event)

        try:
            while True:
                data = await queue.get()
                # yield f"data: {data}\n\n"
                yield f"data: {json.dumps(data)}\n\n"

        finally:
            # Unsubscribe the listener when the connection is closed
            event_manager.listeners.remove(send_event)

    print("returning response")
    # return Response(event_stream(), media_type="text/event-stream")
    return StreamingResponse(event_stream(), media_type="text/event-stream")
