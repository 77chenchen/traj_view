"""Ordered phase rules and optional caller-controlled classification."""

import hashlib
import json
import re
from collections.abc import Callable, MutableMapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import TypedDict

import yaml

from schema.models import Step, Trajectory

from .normalization import NormalizedAction, normalize_action, phase_id


class Phase(TypedDict):
    id: str
    label: str
    symbol: str
    color: str


def _compile(pattern: str) -> re.Pattern[str]:
    # The phase config stores doubled regex escapes inside YAML single quotes.
    return re.compile(pattern.replace(r"\\", "\\"))


@dataclass(frozen=True)
class _Rule:
    phase: str
    tags: frozenset[str]
    tools: frozenset[str]
    paths: tuple[re.Pattern[str], ...]
    commands: tuple[re.Pattern[str], ...]

    def matches(self, step: Step, action: NormalizedAction) -> bool:
        tool = action.tool
        return (
            not self.tags.isdisjoint(step.tags)
            or (tool is not None and (tool in self.tools or tool.rsplit(".", 1)[-1] in self.tools))
            or any(pattern.search(path) for pattern in self.paths for path in action.targets)
            or any(pattern.search(command) for pattern in self.commands for command in action.commands)
        )


class PhaseClassifier:
    def __init__(
        self,
        phases: list[Phase],
        rules: tuple[_Rule, ...],
        llm_cache: MutableMapping[str, str] | None = None,
        llm_classifier: Callable[[Step], str | None] | None = None,
    ) -> None:
        self.phases = phases
        self._phase_ids = {phase["id"] for phase in phases}
        self._rules = rules
        self._llm_cache = llm_cache
        self._llm_classifier = llm_classifier

    @classmethod
    def from_file(
        cls,
        path: str | Path,
        llm_cache: MutableMapping[str, str] | None = None,
        llm_classifier: Callable[[Step], str | None] | None = None,
    ) -> "PhaseClassifier":
        """Load ordered rules and optionally classify rule misses.

        The caller's cache is read and updated in place. The injected callable
        receives a Step on a cache miss and can return a configured phase ID
        or None. Without either input, annotation uses only the loaded rules.
        """
        config = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
        rules = tuple(
            _Rule(
                phase=rule["phase"],
                tags=frozenset(rule.get("tags", ())),
                tools=frozenset(tool.lower() for tool in rule.get("tools", ())),
                paths=tuple(_compile(pattern) for pattern in rule.get("paths", ())),
                commands=tuple(_compile(pattern) for pattern in rule.get("commands", ())),
            )
            for rule in config.get("rules", ())
        )
        return cls(config["phases"], rules, llm_cache, llm_classifier)

    @staticmethod
    def cache_key(step: Step) -> str:
        """SHA-256 hex of compact, sorted-key UTF-8 JSON.

        The JSON contains action and observation (full JSON model dumps or null),
        thought, and tags. It uses unescaped Unicode and preserves array order.
        Indices, timestamps, raw references, tokens and annotations are excluded.
        """
        payload = step.model_dump(
            mode="json", include={"action", "observation", "thought", "tags"}
        )
        encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(encoded.encode("utf-8")).hexdigest()

    def annotate(self, trajectory: Trajectory) -> Trajectory:
        """Annotate steps in place and return the trajectory."""
        for step in trajectory.steps:
            action = normalize_action(step.action)
            rule_phase = next((rule.phase for rule in self._rules if rule.matches(step, action)), None)
            step.phase = rule_phase or "other"
            step.phase_source = "rule"
            if rule_phase is not None or (self._llm_cache is None and self._llm_classifier is None):
                continue
            key = self.cache_key(step)
            cached = self._llm_cache.get(key) if self._llm_cache is not None else None
            if cached is not None and cached in self._phase_ids:
                step.phase = cached
                step.phase_source = "llm"
                continue
            if self._llm_classifier is not None:
                phase = self._llm_classifier(step)
                if phase is not None and phase in self._phase_ids:
                    if self._llm_cache is not None:
                        self._llm_cache[key] = phase
                    step.phase = phase
                    step.phase_source = "llm"
        return trajectory


def langutory(trajectory: Trajectory, phases: Sequence[Phase]) -> str:
    """Join the configured phase symbols in canonical step order."""
    symbols = {phase["id"]: phase["symbol"] for phase in phases}
    fallback = symbols.get("other", "X")
    return " ".join(symbols.get(phase_id(step), fallback) for step in trajectory.steps)
