from fastapi import HTTPException


class AppException(HTTPException):
    pass
