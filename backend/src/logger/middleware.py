import sys
import time
from http import HTTPStatus

from fastapi import Request
from loguru import logger


# class CustomFormatter:
#     def format(self, record):
#         status_code = record["extra"].get("status_code")
#         if status_code >= 500:
#             # Server errors are red
#             color = "\033[31m"
#         elif status_code >= 400:
#             # Client errors are yellow
#             color = "\033[33m"
#         else:
#             # Successful responses are green
#             color = "\033[32m"
#         return f'{color}{record["time"]:YYYY-MM-DD HH:mm:ss} | {record["level"]} | {record["message"]}\033[0m'


# logger.remove()
# logger.add(
#     sys.stderr,
#     format=CustomFormatter().format,
#     diagnose=False,
#     backtrace=False,
# )


logger.remove()
logger.add(
    sys.stderr,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | <level>{message}</level>",
)


async def log_middleware(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)
    print(request)
    process_time = time.time() - start_time
    client = request.client
    log_dict = {
        "client": (
            f"{request.client.host}:{request.client.port}" if client else None  # type: ignore
        ),
        "method": request.method,
        "path": request.url.path,
        "headers": dict(request.headers),
        "query_params": dict(request.query_params),
        "process_time": process_time,
        "response_status": response.status_code,
        "response_phrase": HTTPStatus(response.status_code).phrase,
    }
    log_message = f'{log_dict["client"]} {log_dict["method"]} {log_dict["path"]} {log_dict["response_status"]} {log_dict["response_phrase"]}'
    logger.debug(log_message)
    return response
