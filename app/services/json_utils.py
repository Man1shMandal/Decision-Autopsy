from __future__ import annotations

import json
from json import JSONDecodeError


def parse_json_with_repair(raw_text: str) -> dict[str, object]:
    try:
        parsed = json.loads(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError("Model response must be a JSON object.")
        return parsed
    except (JSONDecodeError, ValueError):
        repaired = _extract_first_json_object(raw_text)
        parsed = json.loads(repaired)
        if not isinstance(parsed, dict):
            raise ValueError("Model response must be a JSON object.")
        return parsed


def _extract_first_json_object(raw_text: str) -> str:
    start = raw_text.find("{")
    if start == -1:
        raise JSONDecodeError("No JSON object found.", raw_text, 0)

    depth = 0
    in_string = False
    escaped = False

    for index in range(start, len(raw_text)):
        char = raw_text[index]
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return raw_text[start : index + 1]

    raise JSONDecodeError("Incomplete JSON object.", raw_text, start)

