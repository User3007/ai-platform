from fastapi import HTTPException


class AppException(HTTPException):
    pass


class UserSafeError(Exception):
    def __init__(
        self,
        user_message: str,
        *,
        code: str,
        source: str,
        retryable: bool,
        status_code: int = 500,
    ) -> None:
        super().__init__(user_message)
        self.user_message = user_message
        self.code = code
        self.source = source
        self.retryable = retryable
        self.status_code = status_code

    def to_response_detail(self) -> dict[str, str | bool]:
        return {
            "message": self.user_message,
            "code": self.code,
            "source": self.source,
            "retryable": self.retryable,
        }


class ChatWarning(UserSafeError):
    pass
