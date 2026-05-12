from io import BytesIO
import unittest

from fastapi import HTTPException, status
from starlette.datastructures import UploadFile

from app.api.production import MAX_CSV_UPLOAD_BYTES, MAX_CSV_UPLOAD_ROWS, _parse_csv_upload


def _upload_file(contents: bytes, filename: str = "production.csv") -> UploadFile:
    return UploadFile(file=BytesIO(contents), filename=filename)


class ProductionCsvUploadParsingTests(unittest.TestCase):
    def test_rejects_uploads_larger_than_maximum(self) -> None:
        upload = _upload_file(b"x" * (MAX_CSV_UPLOAD_BYTES + 1))

        with self.assertRaises(HTTPException) as exc:
            _parse_csv_upload(upload)

        self.assertEqual(exc.exception.status_code, status.HTTP_413_CONTENT_TOO_LARGE)
        self.assertIn("too large", str(exc.exception.detail))

    def test_rejects_csv_with_too_many_rows(self) -> None:
        csv_content = "product_name,daily_capacity,current_demand,stock_level,lead_time_days\n"
        csv_content += "\n".join(f"Widget-{index},10,8,20,3" for index in range(MAX_CSV_UPLOAD_ROWS + 1))

        with self.assertRaises(HTTPException) as exc:
            _parse_csv_upload(_upload_file(csv_content.encode("utf-8")))

        self.assertEqual(exc.exception.status_code, status.HTTP_413_CONTENT_TOO_LARGE)
        self.assertIn("too many rows", str(exc.exception.detail))

    def test_accepts_valid_small_csv(self) -> None:
        csv_content = (
            "product_name,daily_capacity,current_demand,stock_level,lead_time_days\n"
            "Widget-A,500,450,1000,3\n"
        )

        dataframe = _parse_csv_upload(_upload_file(csv_content.encode("utf-8")))

        self.assertEqual(len(dataframe.index), 1)
        self.assertEqual(dataframe.iloc[0]["product_name"], "Widget-A")


if __name__ == "__main__":
    unittest.main()
