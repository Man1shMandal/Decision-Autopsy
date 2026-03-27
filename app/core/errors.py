from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.services.exceptions import AgentExecutionError


def _error_body(
    *,
    code: str,
    message: str,
    details: object | None = None,
    request_id: str | None = None,
) -> dict[str, object]:
    body: dict[str, object] = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    if request_id is not None:
        body["request_id"] = request_id
    return body


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AgentExecutionError)
    async def handle_agent_execution_error(
        request: Request, exc: AgentExecutionError
    ) -> JSONResponse:
        request_id = request.headers.get("x-request-id")
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(
                code=exc.code,
                message=exc.message,
                details=exc.details,
                request_id=request_id,
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        request_id = request.headers.get("x-request-id")
        return JSONResponse(
            status_code=422,
            content=_error_body(
                code="request_validation_error",
                message="Request payload failed validation.",
                details=exc.errors(),
                request_id=request_id,
            ),
        )

