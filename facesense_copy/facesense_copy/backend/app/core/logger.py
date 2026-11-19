import os
import sys
import logging
from logging.handlers import RotatingFileHandler

# Determine base directory for backend
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOGS_DIR = os.path.join(BASE_DIR, "logs")

# Ensure logs directory exists
os.makedirs(LOGS_DIR, exist_ok=True)

# Log file paths
APP_LOG_PATH = os.path.join(LOGS_DIR, "app.log")
ERROR_LOG_PATH = os.path.join(LOGS_DIR, "error.log")
ACCESS_LOG_PATH = os.path.join(LOGS_DIR, "access.log")

# Standard formatters
DETAILED_FORMAT = "%(asctime)s | %(levelname)-8s | [%(name)s:%(lineno)d] | %(message)s"
SIMPLE_FORMAT = "%(asctime)s | %(levelname)-8s | %(message)s"
ACCESS_FORMAT = "%(asctime)s | %(message)s"

DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

formatter = logging.Formatter(DETAILED_FORMAT, datefmt=DATE_FORMAT)
access_formatter = logging.Formatter(ACCESS_FORMAT, datefmt=DATE_FORMAT)


def _build_rotating_handler(
    filepath: str,
    level: int,
    fmt: logging.Formatter,
    max_bytes: int = 10 * 1024 * 1024,  # 10 MB per log file
    backup_count: int = 5                # keep 5 rotated files
) -> RotatingFileHandler:
    handler = RotatingFileHandler(
        filepath,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8"
    )
    handler.setLevel(level)
    handler.setFormatter(fmt)
    return handler


def setup_logger(name: str = "facesense") -> logging.Logger:
    """Configures the main application logger with Console, App, and Error handlers."""
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # Avoid duplicate handlers if already configured
    if logger.handlers:
        return logger

    # 1. Console Handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 2. General App Log File (INFO and above)
    app_file_handler = _build_rotating_handler(APP_LOG_PATH, logging.INFO, formatter)
    logger.addHandler(app_file_handler)

    # 3. Dedicated Error Log File (ERROR and CRITICAL only)
    error_file_handler = _build_rotating_handler(ERROR_LOG_PATH, logging.ERROR, formatter)
    logger.addHandler(error_file_handler)

    logger.propagate = False
    return logger


def setup_access_logger() -> logging.Logger:
    """Configures dedicated HTTP access logger."""
    acc_logger = logging.getLogger("facesense.access")
    acc_logger.setLevel(logging.INFO)

    if acc_logger.handlers:
        return acc_logger

    access_file_handler = _build_rotating_handler(ACCESS_LOG_PATH, logging.INFO, access_formatter)
    acc_logger.addHandler(access_file_handler)

    # Also log access to stdout in development
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(access_formatter)
    acc_logger.addHandler(console_handler)

    acc_logger.propagate = False
    return acc_logger


# Singleton loggers ready to import across the backend
logger = setup_logger("facesense.app")
access_logger = setup_access_logger()
audit_logger = logging.getLogger("facesense.audit")
