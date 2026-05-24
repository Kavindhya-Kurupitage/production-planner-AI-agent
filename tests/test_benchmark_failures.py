import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException, status

from app.agent import benchmark


class _FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def all(self):
        return self._rows


class _FakeSession:
    def __init__(self, rows):
        self._rows = rows

    def query(self, *_args, **_kwargs):
        return _FakeQuery(self._rows)


def _production_row():
    return SimpleNamespace(
        product_name="Widget-A",
        daily_capacity=100,
        current_demand=80,
        stock_level=400,
        lead_time_days=5,
    )


class BenchmarkFailureTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = _FakeSession([_production_row()])

    async def test_plain_model_failure_propagates(self):
        failure = HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Groq unavailable",
        )

        with (
            patch.object(benchmark, "STANDARD_SCENARIO_QUESTIONS", ["Question 1"]),
            patch.object(benchmark, "BENCHMARK_CALL_DELAY_SECONDS", 0),
            patch.object(benchmark, "get_plain_groq_response", AsyncMock(side_effect=failure)),
            patch.object(benchmark, "run_agent", AsyncMock()) as run_agent,
        ):
            with self.assertRaises(HTTPException) as raised:
                await benchmark.run_full_benchmark(company_id=123, db=self.db)

        self.assertEqual(status.HTTP_502_BAD_GATEWAY, raised.exception.status_code)
        run_agent.assert_not_called()

    async def test_agent_failure_propagates(self):
        failure = HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Agent unavailable",
        )

        with (
            patch.object(benchmark, "STANDARD_SCENARIO_QUESTIONS", ["Question 1"]),
            patch.object(benchmark, "BENCHMARK_CALL_DELAY_SECONDS", 0),
            patch.object(
                benchmark,
                "get_plain_groq_response",
                AsyncMock(return_value={"answer": "plain"}),
            ),
            patch.object(
                benchmark,
                "score_response",
                AsyncMock(return_value=benchmark._finalize_score(
                    {
                        "data_specificity": 100,
                        "bottleneck_accuracy": 100,
                        "action_specificity": 100,
                        "completeness": 100,
                        "consistency": 100,
                    }
                )),
            ),
            patch.object(benchmark, "run_agent", AsyncMock(side_effect=failure)),
        ):
            with self.assertRaises(HTTPException) as raised:
                await benchmark.run_full_benchmark(company_id=123, db=self.db)

        self.assertEqual(status.HTTP_502_BAD_GATEWAY, raised.exception.status_code)
