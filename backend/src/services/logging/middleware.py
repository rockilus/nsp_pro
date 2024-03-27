import time

from fastapi import Request

# from services.logging.logger import log
from loguru import logger


async def log_middleware(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)
    print(request)
    process_time = time.time() - start_time
    log_dict = {
        "method": request.method,
        "path": request.url.path,
        "headers": dict(request.headers),
        "query_params": dict(request.query_params),
        "process_time": process_time,
        "response_status": response.status_code,
    }
    logger.info(log_dict)
    return response
