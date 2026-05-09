class AppError(Exception):
    def __init__(self, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class NotFoundError(AppError):
    pass


class UnauthorizedError(AppError):
    pass


class ValidationError(AppError):
    pass


class GroqAPIError(AppError):
    pass
