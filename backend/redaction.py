"""Configurable redaction across canonical and preserved source fields."""

import json
import re
from collections.abc import Iterable
from typing import Any

from schema import Trajectory


MASK = "[REDACTED]"
SECRET_KEYS = (
    "api_key", "apikey", "access_token", "auth_token", "refresh_token",
    "password", "passwd", "credential", "credentials", "secret", "client_secret",
    "authorization", "token", "private_key",
)
KEY_PATTERN = "|".join(SECRET_KEYS)
SECRET_ASSIGNMENT = re.compile(
    rf"(?i)(?P<prefix>(?<![\w.-])(?:[\w.-]+[_-])?(?:{KEY_PATTERN})\\?[\"']?\s*[:=]\s*)"
    r'(?P<value>(?:bearer|basic)\s+[a-z0-9._~+/=-]+|\[REDACTED\]|'
    r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|\\["\'][^\r\n]*?\\["\']|[^\s,;\]}]+)'
)
SECRET_VALUE = re.compile(r"(?i)\bbearer\s+[a-z0-9._~+/=-]+|\bsk-[a-z0-9_-]{8,}\b")


def sensitive_key(value: str) -> bool:
    name = value.lower().replace("-", "_")
    return any(name == key or name.endswith("_" + key) for key in SECRET_KEYS)


class Redactor:
    def __init__(self, patterns: Iterable[str] = ()) -> None:
        self.patterns = [re.compile(pattern) for pattern in patterns]

    def text(self, value: str) -> str:
        if value.lstrip().startswith(("{", "[")):
            try:
                document = json.loads(value)
            except (ValueError, RecursionError):
                pass
            else:
                return self.encode(self.scrub(document, dynamic=True))
        return self.plain_text(value)

    def plain_text(self, value: str) -> str:
        value = SECRET_ASSIGNMENT.sub(self.assignment, value)
        value = SECRET_VALUE.sub(MASK, value)
        for pattern in self.patterns:
            value = pattern.sub(MASK, value)
        return value

    @staticmethod
    def assignment(match: re.Match[str]) -> str:
        value = match["value"]
        for quote in ('\\"', "\\'", '"', "'"):
            if value.startswith(quote) and value.endswith(quote):
                return match["prefix"] + quote + MASK + quote
        return match["prefix"] + MASK

    def scrub(self, value: Any, dynamic: bool = False) -> Any:
        if isinstance(value, str):
            return self.text(value)
        if isinstance(value, list):
            return [self.scrub(item, dynamic) for item in value]
        if isinstance(value, dict):
            return {
                (self.plain_text(key) if dynamic else key):
                MASK if dynamic and sensitive_key(key) else self.scrub(item, dynamic or key in {"args", "meta"})
                for key, item in value.items()
            }
        return value

    @staticmethod
    def encode(value: Any) -> str:
        return json.dumps(value, ensure_ascii=True, separators=(",", ":"))

    def source(self, raw: str, source_format: str) -> str:
        raw = raw.removeprefix("\ufeff")
        if source_format == "openai_messages":
            return self.text(raw)
        records = []
        for line in raw.split("\n"):
            if not line.strip():
                records.append(line)
                continue
            try:
                record = json.loads(line)
            except (ValueError, RecursionError):
                records.append(self.encode(MASK))
            else:
                records.append(self.encode(self.scrub(record, dynamic=True)))
        return "\n".join(records)

    def trajectory(self, value: Trajectory) -> Trajectory:
        canonical = value.model_dump(mode="json", by_alias=True)
        raw = canonical["meta"].pop("raw_text", None)
        scrubbed = self.scrub(canonical)
        if isinstance(raw, str):
            scrubbed["meta"]["raw_text"] = self.source(raw, value.source_format)
        return Trajectory.model_validate(scrubbed)
