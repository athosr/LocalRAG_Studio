from __future__ import annotations

import random
import time
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")


def with_retries(
    fn: Callable[[], T],
    *,
    attempts: int,
    base_ms: int,
    max_ms: int,
) -> T:
    last: BaseException | None = None
    for i in range(attempts):
        try:
            return fn()
        except BaseException as e:
            last = e
            if i == attempts - 1:
                break
            delay_ms = min(
                max_ms,
                base_ms * (2**i) + random.randint(0, 99),
            )
            time.sleep(delay_ms / 1000.0)
    assert last is not None
    raise last
