from loguru import logger


def log_info(message: str) -> None:
    logger.info(message)


def log_error(message: str) -> None:
    logger.error(message)


def log_critical(message: str) -> None:
    logger.critical(message)
