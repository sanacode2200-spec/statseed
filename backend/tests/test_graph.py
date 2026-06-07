import math

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from backend.routers import graph
from backend.schemas.graph import BarplotRequest, BoxplotRequest, ExportRequest, HistogramRequest
from backend.services.graph.plotly_charts import barplot_figure
from backend.services.graph.theme import FONT_PRESETS


def test_boxplot_requires_two_values_per_group() -> None:
    with pytest.raises(ValidationError, match="データ数が2件未満"):
        BoxplotRequest(groups=[[1], [2, 3]])


def test_graph_request_rejects_non_finite_values() -> None:
    with pytest.raises(ValidationError):
        HistogramRequest(values=[1, 2, math.inf])


def test_barplot_figure_sd() -> None:
    req = BarplotRequest(groups=[[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]], group_names=["A", "B"], error_type="sd")
    fig = barplot_figure(req)
    assert len(fig.data) == 2
    bar_a = fig.data[0]
    assert bar_a["y"][0] == pytest.approx(2.0)
    assert bar_a["error_y"]["array"][0] > 0


def test_barplot_figure_sem() -> None:
    req = BarplotRequest(groups=[[10.0, 12.0, 14.0]], error_type="sem")
    fig = barplot_figure(req)
    assert fig.data[0]["y"][0] == pytest.approx(12.0)
    # SEM < SD
    req_sd = BarplotRequest(groups=[[10.0, 12.0, 14.0]], error_type="sd")
    fig_sd = barplot_figure(req_sd)
    assert fig.data[0]["error_y"]["array"][0] < fig_sd.data[0]["error_y"]["array"][0]


def test_barplot_figure_ci95() -> None:
    req = BarplotRequest(groups=[[10.0, 12.0, 14.0]], error_type="ci95")
    fig = barplot_figure(req)
    assert fig.data[0]["error_y"]["array"][0] > 0


def test_barplot_requires_two_values_per_group() -> None:
    with pytest.raises(ValidationError, match="データ数が2件未満"):
        BarplotRequest(groups=[[1.0]])


def test_export_returns_503_when_graph_dependency_is_missing(monkeypatch) -> None:
    def missing_dependency(_request: ExportRequest) -> tuple[bytes, str]:
        raise ImportError

    monkeypatch.setattr(
        "backend.services.graph.matplotlib_export.export_bytes",
        missing_dependency,
    )
    request = ExportRequest(
        chart_type="histogram",
        histogram=HistogramRequest(values=[1, 2, 3]),
    )

    with pytest.raises(HTTPException) as exc_info:
        graph.export(request)

    assert exc_info.value.status_code == 503


@pytest.mark.parametrize("preset", list(FONT_PRESETS.keys()))
def test_export_bytes_applies_each_font_preset(preset: str) -> None:
    from backend.services.graph.matplotlib_export import export_bytes

    request = ExportRequest(
        chart_type="histogram",
        format="png",
        font_preset=preset,
        font_family="Arial" if preset == "カスタム" else None,
        font_size=10 if preset == "カスタム" else None,
        histogram=HistogramRequest(values=[1, 2, 3, 4, 5]),
    )
    data, mime = export_bytes(request)
    assert mime == "image/png"
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
