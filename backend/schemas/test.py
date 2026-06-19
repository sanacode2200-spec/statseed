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


class PosthocRequest(BaseModel):
    variable_name: str = Field(default="変数", min_length=1, max_length=80)
    groups: list[list[FiniteFloat]] = Field(min_length=3)
    group_names: list[str] | None = Field(default=None)
    method: Literal["tukey", "bonferroni", "holm", "steel_dwass"] = "tukey"

    @model_validator(mode="after")
    def check_groups(self) -> "PosthocRequest":
        if self.group_names is not None and len(self.group_names) != len(self.groups):
            raise ValueError("group_namesの数がgroupsの数と一致しません")
        for i, g in enumerate(self.groups):
            if len(g) < 2:
                raise ValueError(f"群{i + 1}のデータ数が2件未満です")
        return self


class PairwiseComparison(BaseModel):
    group_a: str
    group_b: str
    mean_a: float | None = None
    mean_b: float | None = None
    mean_diff: float | None = None
    p_raw: float
    p_adjusted: float
    significant: bool


class PosthocResult(BaseModel):
    method: str
    variable_name: str
    pairs: list[PairwiseComparison]
    n_comparisons: int
    interpretation: str


class TestResult(BaseModel):
    test_name: str
    statistic: float | None
    p_value: float
    effect_size: float | None = None
    effect_size_label: str | None = None
    ci95_low: float | None = None
    ci95_high: float | None = None
    estimate: float | None = None
    estimate_label: str | None = None
    interpretation: str
    note: str | None = None


class CorrelationResult(BaseModel):
    method: str
    r: float
    p_value: float
    n: int
    ci95_low: float | None = None
    ci95_high: float | None = None
    interpretation: str
    note: str | None = None


# ── 反復測定（対応あり3条件以上）ANOVA ────────────────────────────────────────

class RepeatedCondition(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    values: list[FiniteFloat | None] = Field(min_length=2)


class RepeatedMeasuresRequest(BaseModel):
    variable_name: str = Field(default="測定値", min_length=1, max_length=80)
    condition_label: str = Field(default="条件", min_length=1, max_length=40)
    conditions: list[RepeatedCondition] = Field(min_length=3)

    @model_validator(mode="after")
    def check_request(self) -> "RepeatedMeasuresRequest":
        n = len(self.conditions[0].values)
        names: list[str] = []
        for c in self.conditions:
            if len(c.values) != n:
                raise ValueError(
                    f"条件「{c.name}」のデータ数({len(c.values)}件)が"
                    f"他の条件({n}件)と一致しません（同一対象を各条件で測定してください）"
                )
            names.append(c.name)
        if len(set(names)) != len(names):
            raise ValueError("条件名が重複しています")
        return self


class RepeatedMeasuresResult(BaseModel):
    test_name: str
    f_statistic: float
    df_num: float
    df_den: float
    p_value: float
    n_subjects: int
    n_excluded: int
    condition_means: dict[str, float]
    interpretation: str
