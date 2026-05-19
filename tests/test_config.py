import os
import unittest

from pydantic import ValidationError

os.environ["JWT_SECRET_KEY"] = "test_secret_value_12345"

from app.core.config import Settings  # noqa: E402


class SettingsJwtSecretValidationTest(unittest.TestCase):
    def test_rejects_documented_placeholder_secrets(self) -> None:
        placeholders = [
            "change-me",
            "change_me_to_a_long_random_secret",
            "your-random-secret",
            "long-random-string",
            "replace_with_64_hex_characters",
        ]

        for placeholder in placeholders:
            with self.subTest(placeholder=placeholder):
                with self.assertRaises(ValidationError):
                    Settings(jwt_secret_key=placeholder)

    def test_accepts_private_secret_and_strips_whitespace(self) -> None:
        settings = Settings(jwt_secret_key="  0123456789abcdef0123456789abcdef  ")

        self.assertEqual(settings.jwt_secret_key, "0123456789abcdef0123456789abcdef")


if __name__ == "__main__":
    unittest.main()
