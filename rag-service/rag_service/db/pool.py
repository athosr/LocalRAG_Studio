from __future__ import annotations

from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def init_pool(dsn: str) -> None:
    global _pool
    if _pool is not None:
        return
    _pool = ConnectionPool(conninfo=dsn, min_size=1, max_size=10, open=True)


def shutdown_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def get_pool() -> ConnectionPool:
    if _pool is None:
        raise RuntimeError("DB pool not initialized")
    return _pool
