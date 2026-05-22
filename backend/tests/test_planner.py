import unittest

from app.agent.planner import _extract_increase_percent


class ExtractIncreasePercentTest(unittest.TestCase):
    def test_non_numeric_json_value_falls_back_to_question_percent(self) -> None:
        result = _extract_increase_percent(
            "What if demand increases by 25% next month?",
            '{"increase_percent": "N/A"}',
        )

        self.assertEqual(result, 25.0)

    def test_null_json_value_falls_back_to_default_when_question_has_no_percent(self) -> None:
        result = _extract_increase_percent(
            "What should we prioritize next month?",
            '{"increase_percent": null}',
        )

        self.assertEqual(result, 10.0)


if __name__ == "__main__":
    unittest.main()
