import os
import unittest

from pydantic import ValidationError

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")

from app.api.routes import MAX_PLAN_CONSTRAINTS_LENGTH, PlanRequest  # noqa: E402
from app.schemas.scenario import MAX_SCENARIO_QUESTION_LENGTH, ScenarioRunRequest  # noqa: E402


class LlmInputLimitTests(unittest.TestCase):
    def test_scenario_question_rejects_oversized_prompt(self) -> None:
        with self.assertRaises(ValidationError):
            ScenarioRunRequest(question="x" * (MAX_SCENARIO_QUESTION_LENGTH + 1))

    def test_plan_constraints_rejects_oversized_prompt(self) -> None:
        with self.assertRaises(ValidationError):
            PlanRequest(
                product_name="Widget",
                target_units=100,
                timeframe_days=7,
                constraints="x" * (MAX_PLAN_CONSTRAINTS_LENGTH + 1),
            )

    def test_allows_prompt_at_configured_limit(self) -> None:
        scenario = ScenarioRunRequest(question="x" * MAX_SCENARIO_QUESTION_LENGTH)
        plan = PlanRequest(
            product_name="Widget",
            target_units=100,
            timeframe_days=7,
            constraints="x" * MAX_PLAN_CONSTRAINTS_LENGTH,
        )

        self.assertEqual(len(scenario.question), MAX_SCENARIO_QUESTION_LENGTH)
        self.assertEqual(len(plan.constraints), MAX_PLAN_CONSTRAINTS_LENGTH)


if __name__ == "__main__":
    unittest.main()
