import os
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import Mock, patch

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")

from fastapi import HTTPException

from app.agent import benchmark as agent_benchmark
from app.api import benchmark as benchmark_api


class _ProductionQuery:
    def __init__(self, rows):
        self._rows = rows

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def all(self):
        return self._rows


class _ProductionDb:
    def __init__(self, rows):
        self._rows = rows

    def query(self, *args, **kwargs):
        return _ProductionQuery(self._rows)


def _production_rows():
    return [
        SimpleNamespace(
            product_name="Widget-A",
            daily_capacity=100,
            current_demand=90,
            stock_level=50,
            lead_time_days=3,
        )
    ]


class BenchmarkFailureTests(IsolatedAsyncioTestCase):
    async def test_plain_model_failure_aborts_benchmark(self):
        async def fail_plain_response(question):
            raise HTTPException(status_code=502, detail="Plain model unavailable.")

        with (
            patch.object(agent_benchmark, "get_plain_groq_response", side_effect=fail_plain_response),
            patch.object(agent_benchmark, "BENCHMARK_CALL_DELAY_SECONDS", 0),
        ):
            with self.assertRaises(HTTPException) as raised:
                await agent_benchmark.run_full_benchmark(company_id=1, db=_ProductionDb(_production_rows()))

        self.assertEqual(raised.exception.status_code, 502)

    async def test_agent_failure_aborts_benchmark(self):
        async def plain_response(question):
            return {"answer": "Widget-A has demand 90, capacity 100, stock 50, and should reorder stock this week."}

        async def fail_agent_response(question, company_id, db):
            raise HTTPException(status_code=502, detail="Agent unavailable.")

        with (
            patch.object(agent_benchmark, "get_plain_groq_response", side_effect=plain_response),
            patch.object(agent_benchmark, "run_agent", side_effect=fail_agent_response),
            patch.object(agent_benchmark, "BENCHMARK_CALL_DELAY_SECONDS", 0),
        ):
            with self.assertRaises(HTTPException) as raised:
                await agent_benchmark.run_full_benchmark(company_id=1, db=_ProductionDb(_production_rows()))

        self.assertEqual(raised.exception.status_code, 502)

    async def test_api_does_not_persist_when_benchmark_generation_fails(self):
        fake_db = SimpleNamespace(add=Mock(), commit=Mock(), refresh=Mock())

        async def fail_benchmark(company_id, db):
            raise HTTPException(status_code=502, detail="Benchmark generation failed.")

        with (
            patch.object(benchmark_api, "_get_user_company_or_404", return_value=object()),
            patch.object(benchmark_api, "run_full_benchmark", side_effect=fail_benchmark),
        ):
            with self.assertRaises(HTTPException):
                await benchmark_api.run_benchmark(
                    company_id=1,
                    db=fake_db,
                    current_user=SimpleNamespace(id=7),
                )

        fake_db.add.assert_not_called()
        fake_db.commit.assert_not_called()
        fake_db.refresh.assert_not_called()
