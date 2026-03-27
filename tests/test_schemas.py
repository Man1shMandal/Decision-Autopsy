from pydantic import ValidationError

from app.schemas.agent import AgentRequest, ErrorResponse, ListenerOutput, QuestionerOutput


def test_agent_request_accepts_compact_context() -> None:
    request = AgentRequest.model_validate(
        {
            "context": {
                "decision": {"title": "Should I quit my job?"},
                "answers": {"financial_reality": "I have 6 months of savings"},
            },
            "input": {"user_message": "I want to leave but I am scared."},
            "metadata": {"request_id": "req-1", "debug": False},
        }
    )

    assert request.context.decision.title == "Should I quit my job?"
    assert request.context.answers.financial_reality == "I have 6 months of savings"


def test_context_rejects_unknown_top_level_fields() -> None:
    try:
        AgentRequest.model_validate(
            {
                "context": {
                    "decision": {"title": "Move cities?"},
                    "unexpected": "break-contract",
                },
                "input": {},
            }
        )
    except ValidationError as exc:
        assert "unexpected" in str(exc)
    else:
        raise AssertionError("ValidationError was expected for unknown fields.")


def test_listener_output_contract() -> None:
    output = ListenerOutput.model_validate(
        {
            "interpreted_decision": "Whether to leave a stable job for a startup role",
            "situation_summary": "The user feels pulled toward growth but fears instability.",
            "confidence_score": 42,
            "clarity_score": 37,
            "missing_information": ["current savings runway", "family obligations"],
            "emotional_signals": ["fear", "restlessness"],
        }
    )

    assert output.confidence_score == 42
    assert output.missing_information[0] == "current savings runway"


def test_listener_output_normalizes_provider_shape() -> None:
    output = ListenerOutput.model_validate(
        {
            "interpreted_decision": "Whether to leave current employment",
            "situation_summary": "The user wants autonomy but fears failure.",
            "confidence_score": 0.75,
            "clarity_score": 0.65,
            "missing_information": ["burn rate"],
            "emotional_signals": [
                {"emotion": "fear", "intensity": "high"},
                "restlessness",
            ],
        }
    )

    assert output.confidence_score == 75
    assert output.clarity_score == 65
    assert output.emotional_signals == ["fear:high", "restlessness"]


def test_questioner_output_contract() -> None:
    output = QuestionerOutput.model_validate(
        {
            "recommended_focus": "financial_reality",
            "questions": [
                {
                    "question_id": "financial-runway",
                    "question": "How many months can you cover living costs without salary?",
                    "priority": "high",
                    "category": "financial",
                    "rationale": "This determines whether the risk is survivable.",
                }
            ],
        }
    )

    assert output.questions[0].category == "financial"


def test_questioner_output_normalizes_common_aliases() -> None:
    output = QuestionerOutput.model_validate(
        {
            "recommended_focus": "financial_reality",
            "questions": [
                {
                    "id": "runway",
                    "text": "How many months of savings do you have?",
                    "priority": "high",
                    "category": "financial",
                    "context": "This determines survivability.",
                }
            ],
        }
    )

    assert output.questions[0].question_id == "runway"
    assert output.questions[0].question == "How many months of savings do you have?"
    assert output.questions[0].rationale == "This determines survivability."


def test_error_response_contract() -> None:
    error = ErrorResponse.model_validate(
        {
            "error": {
                "code": "invalid_model_output",
                "message": "Model output did not match the expected schema.",
            },
            "request_id": "req-9",
        }
    )

    assert error.error.code == "invalid_model_output"
