import logging
import re
import sys
import structlog
from app.config import settings


class _HealthcheckAccessFilter(logging.Filter):
    _healthcheck_pattern = re.compile(r'"(?:GET|HEAD) /health(?:\?[^"]*)? HTTP/')

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            message = record.getMessage()
        except Exception:
            return True

        return not bool(self._healthcheck_pattern.search(message))


def configure_logging() -> None:
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.is_development:
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=False),
        ]
    else:
        processors = shared_processors + [
            structlog.processors.JSONRenderer(),
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    if settings.SUPPRESS_HEALTHCHECK_ACCESS_LOGS:
        logging.getLogger("uvicorn.access").addFilter(_HealthcheckAccessFilter())


def get_logger(name: str = __name__):
    return structlog.get_logger(name)
