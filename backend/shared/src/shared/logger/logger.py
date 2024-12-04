import sys

from loguru import logger

logger.remove()
logger.add(
    sys.stderr,
    format="<level>{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}</level>",
)


def log_debug(message: str) -> None:
    logger.debug(message)


def log_info(message: str) -> None:
    logger.opt(exception=True).log("INFO", message)


def log_error(message: str) -> None:
    logger.error(message)


def log_critical(message: str) -> None:
    logger.critical(message)
