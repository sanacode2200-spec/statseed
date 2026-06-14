from typing import Literal

from pydantic import BaseModel


class GuideRequest(BaseModel):
    purpose: Literal["compare", "correlate"]
    data_type: Literal["continuous", "categorical"] = "continuous"
    n_groups: Literal[2, 3] = 2
    paired: bool = False
    normal: Literal["yes", "no", "unknown"] = "unknown"
    estimand: Literal["mean", "distribution"] | None = None


class SuggestedTest(BaseModel):
    test_name: str
    endpoint: str
    confidence: Literal["推奨", "代替案"]
    reason: str
    caution: str = ""


class GuideResponse(BaseModel):
    suggestions: list[SuggestedTest]
    summary: str
