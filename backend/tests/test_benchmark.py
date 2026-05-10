import unittest

from fastapi import HTTPException, status

from app.agent import benchmark as benchmark_module
from app.models.production import ProductionData


class _ProductionDataQuery:
    def __init__(self, rows: list[ProductionData]) -> None:
        self._rows = rows

    def filter(self, *_args: object) -> "_ProductionDataQuery":
        return self

    def order_by(self, *_args: object) -> "_ProductionDataQuery":
        return self

    def all(self) -> list[ProductionData]:
        return self._rows


class _DbSession:
    def __init__(self) -> None:
        self.rows = [
            ProductionData(
                company_id=1,
                product_name="Widget A",
                daily_capacity=100,
                current_demand=80,
                stock_level=240,
                lead_time_days=3,
            )
        ]

    def query(self, _model: object) -> _ProductionDataQuery:
        return _ProductionDataQuery(self.rows)


class BenchmarkFailureTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.original_get_plain_groq_response = benchmark_module.get_plain_groq_response
        self.original_run_agent = benchmark_module.run_agent
        self.original_sleep = benchmark_module.asyncio.sleep

        async def _no_sleep(_seconds: float) -> None:
            return None

        benchmark_module.asyncio.sleep = _no_sleep

    async def asyncTearDown(self) -> None:
        benchmark_module.get_plain_groq_response = self.original_get_plain_groq_response
        benchmark_module.run_agent = self.original_run_agent
        benchmark_module.asyncio.sleep = self.original_sleep

    async def test_plain_model_failure_aborts_benchmark(self) -> None:
        async def _failing_plain_response(_question: str) -> dict[str, object]:
            raise RuntimeError("rate limit")

        benchmark_module.get_plain_groq_response = _failing_plain_response

        with self.assertRaises(HTTPException) as context:
            await benchmark_module.run_full_benchmark(company_id=1, db=_DbSession())

        self.assertEqual(context.exception.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("plain model response", str(context.exception.detail))
        self.assertIn("No benchmark result was saved", str(context.exception.detail))

    async def test_agent_failure_aborts_benchmark(self) -> None:
        async def _successful_plain_response(_question: str) -> dict[str, object]:
            return {"answer": "Widget A has demand of 80 and capacity of 100."}

        async def _failing_agent_response(
            _question: str,
            _company_id: int,
            _db: _DbSession,
        ) -> dict[str, object]:
            raise RuntimeError("agent timeout")

        benchmark_module.get_plain_groq_response = _successful_plain_response
        benchmark_module.run_agent = _failing_agent_response

        with self.assertRaises(HTTPException) as context:
            await benchmark_module.run_full_benchmark(company_id=1, db=_DbSession())

        self.assertEqual(context.exception.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("planning agent response", str(context.exception.detail))
        self.assertIn("No benchmark result was saved", str(context.exception.detail))


if __name__ == "__main__":
    unittest.main()
