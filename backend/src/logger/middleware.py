import sys
import time
from http import HTTPStatus

from fastapi import Request
from loguru import logger

logger.remove()
logger.add(
    sys.stderr,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | <level>{message}</level>",
)


async def log_middleware(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)
    process_time = time.time() - start_time
    client = request.client
    log_dict = {
        "client": (
            f"{request.client.host}:{request.client.port}"  # type: ignore
            if client
            else None
        ),
        "method": request.method,
        "path": request.url.path,
        "headers": dict(request.headers),
        "query_params": dict(request.query_params),
        "process_time": process_time,
        "response_status": response.status_code,
        "response_phrase": HTTPStatus(response.status_code).phrase,
    }
    log_message = (
        f'{log_dict["client"]} {log_dict["method"]} '
        + f'{log_dict["path"]} {log_dict["response_status"]} '
        + f'{log_dict["response_phrase"]}'
    )
    logger.debug(log_message)
    return response
