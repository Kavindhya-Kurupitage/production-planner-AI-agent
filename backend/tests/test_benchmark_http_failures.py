from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException, status

from app.agent import benchmark


class FakeQuery:
    def __init__(self, rows: list[SimpleNamespace]) -> None:
        self.rows = rows

    def filter(self, *args: object) -> "FakeQuery":
        return self

    def order_by(self, *args: object) -> "FakeQuery":
        return self

    def all(self) -> list[SimpleNamespace]:
        return self.rows


class FakeDb:
    def __init__(self, rows: list[SimpleNamespace]) -> None:
        self.rows = rows

    def query(self, *args: object) -> FakeQuery:
        return FakeQuery(self.rows)


def production_rows() -> list[SimpleNamespace]:
    return [
        SimpleNamespace(
            product_name="Widget A",
            daily_capacity=100,
            current_demand=80,
            stock_level=500,
            lead_time_days=3,
        )
    ]


class BenchmarkHttpFailureTests(IsolatedAsyncioTestCase):
    async def test_plain_model_http_exception_propagates(self) -> None:
        expected = HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GROQ_API_KEY is not configured.",
        )

        with patch.object(benchmark, "get_plain_groq_response", new=AsyncMock(side_effect=expected)):
            with self.assertRaises(HTTPException) as raised:
                await benchmark.run_full_benchmark(company_id=1, db=FakeDb(production_rows()))  # type: ignore[arg-type]

        self.assertEqual(raised.exception.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(raised.exception.detail, "GROQ_API_KEY is not configured.")

    async def test_agent_http_exception_propagates_after_plain_model_success(self) -> None:
        expected = HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Groq request failed after retries.",
        )

        with (
            patch.object(
                benchmark,
                "get_plain_groq_response",
                new=AsyncMock(return_value={"answer": "Widget A has demand 80, capacity 100, and stock 500."}),
            ),
            patch.object(benchmark, "run_agent", new=AsyncMock(side_effect=expected)),
            patch.object(benchmark.asyncio, "sleep", new=AsyncMock()),
        ):
            with self.assertRaises(HTTPException) as raised:
                await benchmark.run_full_benchmark(company_id=1, db=FakeDb(production_rows()))  # type: ignore[arg-type]

        self.assertEqual(raised.exception.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(raised.exception.detail, "Groq request failed after retries.")
