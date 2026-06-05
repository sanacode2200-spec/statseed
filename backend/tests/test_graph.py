import math

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from backend.routers import graph
from backend.schemas.graph import BoxplotRequest, ExportRequest, HistogramRequest


def test_boxplot_requires_two_values_per_group() -> None:
    with pytest.raises(ValidationError, match="データ数が2件未満"):
        BoxplotRequest(groups=[[1], [2, 3]])


def test_graph_request_rejects_non_finite_values() -> None:
    with pytest.raises(ValidationError):
        HistogramRequest(values=[1, 2, math.inf])


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
