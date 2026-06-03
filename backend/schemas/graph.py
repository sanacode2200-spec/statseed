from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class BoxplotRequest(BaseModel):
    groups: list[list[float]] = Field(min_length=1)
    group_names: list[str] | None = None
    title: str = ""
    y_label: str = ""
    show_jitter: bool = True

    @model_validator(mode="after")
    def check_names(self) -> "BoxplotRequest":
        if self.group_names is not None and len(self.group_names) != len(self.groups):
            raise ValueError("group_namesの数がgroupsの数と一致しません")
        return self


class HistogramRequest(BaseModel):
    values: list[float] = Field(min_length=3)
    title: str = ""
    x_label: str = ""
    bins: int | None = Field(default=None, ge=2, le=100)
    show_normal_curve: bool = True


class ScatterRequest(BaseModel):
    x: list[float] = Field(min_length=3)
    y: list[float] = Field(min_length=3)
    title: str = ""
    x_label: str = ""
    y_label: str = ""
    show_regression: bool = True

    @model_validator(mode="after")
    def check_length(self) -> "ScatterRequest":
        if len(self.x) != len(self.y):
            raise ValueError("xとyのデータ数が一致しません")
        return self


class PlotlyFigure(BaseModel):
    data: list[dict[str, Any]]
    layout: dict[str, Any]


class ExportRequest(BaseModel):
    chart_type: Literal["boxplot", "histogram", "scatter"]
    format: Literal["png", "svg", "pdf"] = "png"
    boxplot: BoxplotRequest | None = None
    histogram: HistogramRequest | None = None
    scatter: ScatterRequest | None = None

    @model_validator(mode="after")
    def check_chart_data(self) -> "ExportRequest":
        required = {"boxplot": self.boxplot, "histogram": self.histogram, "scatter": self.scatter}
        if required[self.chart_type] is None:
            raise ValueError(f"chart_type='{self.chart_type}' のデータが含まれていません")
        return self
