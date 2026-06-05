from typing import Literal

from pydantic import BaseModel, Field, model_validator

from backend.schemas.common import FiniteFloat


class TwoGroupRequest(BaseModel):
    variable_name: str = Field(default="変数", min_length=1, max_length=80)
    group_a: list[FiniteFloat] = Field(min_length=2)
    group_b: list[FiniteFloat] = Field(min_length=2)
    group_a_name: str = Field(default="群A", min_length=1, max_length=40)
    group_b_name: str = Field(default="群B", min_length=1, max_length=40)


class PairedRequest(BaseModel):
    variable_name: str = Field(default="変数", min_length=1, max_length=80)
    before: list[FiniteFloat] = Field(min_length=2)
    after: list[FiniteFloat] = Field(min_length=2)

    @model_validator(mode="after")
    def check_same_length(self) -> "PairedRequest":
        if len(self.before) != len(self.after):
            raise ValueError("beforeとafterのデータ数が一致しません")
        return self


class MultiGroupRequest(BaseModel):
    variable_name: str = Field(default="変数", min_length=1, max_length=80)
    groups: list[list[FiniteFloat]] = Field(min_length=3)
    group_names: list[str] | None = Field(default=None)

    @model_validator(mode="after")
    def check_group_names(self) -> "MultiGroupRequest":
        if self.group_names is not None and len(self.group_names) != len(self.groups):
            raise ValueError("group_namesの数がgroupsの数と一致しません")
        for i, g in enumerate(self.groups):
            if len(g) < 2:
                raise ValueError(f"群{i + 1}のデータ数が2件未満です")
        return self


class ChiSquareRequest(BaseModel):
    observed: list[list[int]] = Field(min_length=2)

    @model_validator(mode="after")
    def check_table(self) -> "ChiSquareRequest":
        ncols = len(self.observed[0])
        if ncols < 2:
            raise ValueError("クロス集計表は2列以上必要です")
        for row in self.observed:
            if len(row) != ncols:
                raise ValueError("クロス集計表の列数が行によって異なります")
            if any(c < 0 for c in row):
                raise ValueError("観測度数に負の値が含まれています")
            if sum(row) == 0:
                raise ValueError("合計が0の行は含められません")
        if any(sum(row[col] for row in self.observed) == 0 for col in range(ncols)):
            raise ValueError("合計が0の列は含められません")
        return self


class CorrelationRequest(BaseModel):
    variable_x_name: str = Field(default="X", min_length=1, max_length=80)
    variable_y_name: str = Field(default="Y", min_length=1, max_length=80)
    x: list[FiniteFloat] = Field(min_length=3)
    y: list[FiniteFloat] = Field(min_length=3)
    method: Literal["pearson", "spearman"] = "pearson"

    @model_validator(mode="after")
    def check_same_length(self) -> "CorrelationRequest":
        if len(self.x) != len(self.y):
            raise ValueError("xとyのデータ数が一致しません")
        return self


class TestResult(BaseModel):
    test_name: str
    statistic: float | None
    p_value: float
    effect_size: float | None = None
    effect_size_label: str | None = None
    ci95_low: float | None = None
    ci95_high: float | None = None
    interpretation: str


class CorrelationResult(BaseModel):
    method: str
    r: float
    p_value: float
    n: int
    ci95_low: float | None = None
    ci95_high: float | None = None
    interpretation: str
