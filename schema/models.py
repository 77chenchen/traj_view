"""Canonical, source-independent trajectory model."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator


class Record(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Outcome(Record):
    label: str = "unknown"
    passed: bool | None = None
    partial_score: float | None = None
    finish_reason: str | None = None


class Limits(Record):
    max_steps: int | None = Field(default=None, ge=0)
    wall_clock_s: float | None = Field(default=None, ge=0)


class Usage(Record):
    input_tokens: int | None = Field(default=None, ge=0)
    output_tokens: int | None = Field(default=None, ge=0)
    wall_s: float | None = Field(default=None, ge=0)


class Tokens(Record):
    in_: int | None = Field(default=None, alias="in", ge=0)
    out: int | None = Field(default=None, ge=0)


class RawRef(Record):
    file: str
    line: int | None = Field(default=None, ge=1)


class Action(Record):
    tool: str
    args: dict[str, JsonValue] = Field(default_factory=dict)
    command: str | None = None
    targets: list[str] = Field(default_factory=list)


class Observation(Record):
    text: str
    truncated: bool = False
    error: bool = False
    exit_code: int | None = None


class Step(Record):
    idx: int = Field(ge=0)
    ts: str | None = None
    thought: str | None = None
    action: Action | None = None
    observation: Observation | None = None
    tokens: Tokens | None = None
    raw_ref: RawRef
    phase: str | None = None
    phase_source: Literal["rule", "llm"] | None = None
    tags: list[str] = Field(default_factory=list)


class Trajectory(Record):
    id: str = Field(min_length=1)
    source_format: str = Field(min_length=1)
    task_id: str = Field(min_length=1)
    model: str = "unknown"
    agent: str = "unknown"
    condition: str = "default"
    outcome: Outcome = Field(default_factory=Outcome)
    limits: Limits | None = None
    usage: Usage | None = None
    meta: dict[str, JsonValue] = Field(default_factory=dict)
    steps: list[Step] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_step_order(self) -> "Trajectory":
        indices = [step.idx for step in self.steps]
        if any(left >= right for left, right in zip(indices, indices[1:])):
            raise ValueError("step indices must be unique and in ascending order")
        return self
