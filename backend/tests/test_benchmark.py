from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException, status

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-at-least-16")

from app.agent import benchmark  # noqa: E402


class _FakeQuery:
    def filter(self, *args: object, **kwargs: object) -> "_FakeQuery":
        return self

    def order_by(self, *args: object, **kwargs: object) -> "_FakeQuery":
        return self

    def all(self) -> list[SimpleNamespace]:
        return [
            SimpleNamespace(
                product_name="Widget",
                daily_capacity=100,
                current_demand=80,
                stock_level=30,
                lead_time_days=5,
            )
        ]


class _FakeDb:
    def query(self, *args: object, **kwargs: object) -> _FakeQuery:
        return _FakeQuery()


class BenchmarkFailureTests(unittest.IsolatedAsyncioTestCase):
    async def test_plain_model_failure_aborts_without_synthetic_scores(self) -> None:
        with (
            patch.object(benchmark, "STANDARD_SCENARIO_QUESTIONS", ["Question 1"]),
            patch.object(benchmark, "BENCHMARK_CALL_DELAY_SECONDS", 0),
            patch.object(
                benchmark,
                "get_plain_groq_response",
                new=AsyncMock(side_effect=RuntimeError("rate limited")),
            ),
        ):
            with self.assertRaises(HTTPException) as raised:
                await benchmark.run_full_benchmark(company_id=1, db=_FakeDb())

        self.assertEqual(raised.exception.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("plain model failed on question 1", str(raised.exception.detail))
        self.assertIn("No benchmark result was saved", str(raised.exception.detail))

    async def test_agent_failure_aborts_without_synthetic_scores(self) -> None:
        with (
            patch.object(benchmark, "STANDARD_SCENARIO_QUESTIONS", ["Question 1"]),
            patch.object(benchmark, "BENCHMARK_CALL_DELAY_SECONDS", 0),
            patch.object(
                benchmark,
                "get_plain_groq_response",
                new=AsyncMock(return_value={"answer": "Plain answer"}),
            ),
            patch.object(
                benchmark,
                "score_response",
                new=AsyncMock(return_value={"total_score": 1000}),
            ),
            patch.object(
                benchmark,
                "run_agent",
                new=AsyncMock(side_effect=RuntimeError("upstream unavailable")),
            ),
        ):
            with self.assertRaises(HTTPException) as raised:
                await benchmark.run_full_benchmark(company_id=1, db=_FakeDb())

        self.assertEqual(raised.exception.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("agent failed on question 1", str(raised.exception.detail))
        self.assertIn("No benchmark result was saved", str(raised.exception.detail))

