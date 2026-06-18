from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from backend.schemas.common import FiniteFloat


class BoxplotRequest(BaseModel):
    groups: list[list[FiniteFloat]] = Field(min_length=1)
    group_names: list[str] | None = None
    title: str = ""
    y_label: str = ""
    show_jitter: bool = True
    display_style: Literal["auto", "simple", "distribution", "individual"] = "auto"
    color_mode: Literal["color", "monochrome"] = "color"
    show_n: bool = True
    show_grid: bool = True
    y_min: FiniteFloat | None = None
    y_max: FiniteFloat | None = None
    show_comparison: bool = False
    comparison_method: Literal["parametric", "nonparametric"] = "parametric"

    @model_validator(mode="after")
    def check_names(self) -> "BoxplotRequest":
        if self.group_names is not None and len(self.group_names) != len(self.groups):
            raise ValueError("group_namesの数がgroupsの数と一致しません")
        for i, group in enumerate(self.groups):
            if len(group) < 2:
                raise ValueError(f"群{i + 1}のデータ数が2件未満です")
        if self.y_min is not None and self.y_max is not None and self.y_min >= self.y_max:
            raise ValueError("Y軸の最大値は最小値より大きくしてください")
        return self


class BoxplotPairComparison(BaseModel):
    group_a: str
    group_b: str
    p_value: float
    significant: bool


class BoxplotComparisonResult(BaseModel):
    method: str
    omnibus_p_value: float | None = None
    effect_size: float | None = None
    effect_size_label: str | None = None
    pairs: list[BoxplotPairComparison]
    note: str


class BoxplotResult(BaseModel):
    figure: "PlotlyFigure"
    comparison: BoxplotComparisonResult | None = None


class HistogramRequest(BaseModel):
    values: list[FiniteFloat] = Field(min_length=3)
    title: str = ""
    x_label: str = ""
    bins: int | None = Field(default=None, ge=2, le=100)
    show_normal_curve: bool = True


class ScatterRequest(BaseModel):
    x: list[FiniteFloat] = Field(min_length=3)
    y: list[FiniteFloat] = Field(min_length=3)
    title: str = ""
    x_label: str = ""
    y_label: str = ""
    show_regression: bool = True

    @model_validator(mode="after")
    def check_length(self) -> "ScatterRequest":
        if len(self.x) != len(self.y):
            raise ValueError("xとyのデータ数が一致しません")
        return self


class PairedPlotRequest(BaseModel):
    before: list[FiniteFloat] = Field(min_length=2)
    after: list[FiniteFloat] = Field(min_length=2)
    before_label: str = "介入前"
    after_label: str = "介入後"
    title: str = ""
    y_label: str = ""

    @model_validator(mode="after")
    def check_length(self) -> "PairedPlotRequest":
        if len(self.before) != len(self.after):
            raise ValueError("beforeとafterのデータ数が一致しません")
        return self


class ROCRequest(BaseModel):
    scores: list[FiniteFloat] = Field(min_length=4)
    labels: list[int] = Field(min_length=4)
    title: str = ""
    score_label: str = "スコア"

    @model_validator(mode="after")
    def check(self) -> "ROCRequest":
        if len(self.scores) != len(self.labels):
            raise ValueError("scores と labels の長さが一致しません")
        if any(lbl not in (0, 1) for lbl in self.labels):
            raise ValueError("labels は 0（陰性）または 1（陽性）のみ入力できます")
        return self


class ROCResponse(BaseModel):
    fpr: list[float]
    tpr: list[float]
    thresholds: list[float]
    auc: float
    auc_ci_lower: float
    auc_ci_upper: float
    optimal_threshold: float
    optimal_fpr: float
    optimal_tpr: float
    n_pos: int
    n_neg: int
    interpretation: str


class KaplanMeierRequest(BaseModel):
    times: list[FiniteFloat] = Field(min_length=2)
    events: list[int] = Field(min_length=2)
    group_labels: list[str | None] | None = None
    title: str = ""
    time_label: str = "時間"
    survival_label: str = "生存率"
    show_ci: bool = True
    show_risk_table: bool = True

    @model_validator(mode="after")
    def check(self) -> "KaplanMeierRequest":
        if len(self.times) != len(self.events):
            raise ValueError("times と events の長さが一致しません")
        if any(e not in (0, 1) for e in self.events):
            raise ValueError("events は 0（打ち切り）または 1（イベント）のみ入力できます")
        if any(float(t) < 0 for t in self.times):
            raise ValueError("times には 0 以上の値を入力してください")
        if self.group_labels is not None and len(self.group_labels) != len(self.times):
            raise ValueError("group_labels と times の長さが一致しません")
        return self


class BarplotRequest(BaseModel):
    groups: list[list[FiniteFloat]] = Field(min_length=1)
    group_names: list[str] | None = None
    title: str = ""
    y_label: str = ""
    error_type: Literal["sd", "sem", "ci95"] = "sd"

    @model_validator(mode="after")
    def check_names(self) -> "BarplotRequest":
        if self.group_names is not None and len(self.group_names) != len(self.groups):
            raise ValueError("group_namesの数がgroupsの数と一致しません")
        for i, group in enumerate(self.groups):
            if len(group) < 2:
                raise ValueError(f"群{i + 1}のデータ数が2件未満です")
        return self


class PlotlyFigure(BaseModel):
    data: list[dict[str, Any]]
    layout: dict[str, Any]


class ExportRequest(BaseModel):
    chart_type: Literal["boxplot", "histogram", "scatter", "paired", "barplot", "kaplan_meier", "roc"]
    format: Literal["png", "svg", "pdf"] = "png"
    transparent: bool = True
    font_preset: Literal["論文標準", "日本語対応", "ポスター", "カスタム"] | None = None
    font_family: str | None = Field(default=None, max_length=80)
    font_size: int | None = Field(default=None, ge=6, le=24)
    width_inches: FiniteFloat | None = Field(default=None, ge=2, le=16)
    height_inches: FiniteFloat | None = Field(default=None, ge=2, le=16)
    boxplot: BoxplotRequest | None = None
    histogram: HistogramRequest | None = None
    scatter: ScatterRequest | None = None
    paired: PairedPlotRequest | None = None
    barplot: BarplotRequest | None = None
    kaplan_meier: KaplanMeierRequest | None = None
    roc: ROCRequest | None = None
    # グラフ編集パネルからのオーバーライド
    override_title: str | None = Field(default=None, max_length=200)
    override_x_label: str | None = Field(default=None, max_length=200)
    override_y_label: str | None = Field(default=None, max_length=200)
    override_x_range: list[FiniteFloat] | None = None
    override_y_range: list[FiniteFloat] | None = None
    override_show_legend: bool | None = None
    override_legend_position: Literal["top-right", "top-left", "bottom-right", "bottom-left"] | None = None

    @model_validator(mode="after")
    def check_chart_data(self) -> "ExportRequest":
        required = {
            "boxplot": self.boxplot,
            "histogram": self.histogram,
            "scatter": self.scatter,
            "paired": self.paired,
            "barplot": self.barplot,
            "kaplan_meier": self.kaplan_meier,
            "roc": self.roc,
        }
        if required[self.chart_type] is None:
            raise ValueError(f"chart_type='{self.chart_type}' のデータが含まれていません")
        if self.override_x_range is not None:
            if len(self.override_x_range) != 2:
                raise ValueError("override_x_range は [最小, 最大] の2要素で指定してください")
            if self.override_x_range[0] >= self.override_x_range[1]:
                raise ValueError("override_x_range: 最小値は最大値より小さくしてください")
        if self.override_y_range is not None:
            if len(self.override_y_range) != 2:
                raise ValueError("override_y_range は [最小, 最大] の2要素で指定してください")
            if self.override_y_range[0] >= self.override_y_range[1]:
                raise ValueError("override_y_range: 最小値は最大値より小さくしてください")
        return self
