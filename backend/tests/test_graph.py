import math

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from backend.routers import graph
from backend.schemas.graph import BarplotRequest, BoxplotRequest, ExportRequest, HistogramRequest, PairedPlotRequest
from backend.services.graph.plotly_charts import barplot_figure, boxplot_figure, paired_figure
from backend.services.graph.theme import FONT_PRESETS


def test_boxplot_requires_two_values_per_group() -> None:
    with pytest.raises(ValidationError, match="データ数が2件未満"):
        BoxplotRequest(groups=[[1], [2, 3]])


def test_boxplot_auto_style_shows_individual_values_for_small_groups() -> None:
    fig = boxplot_figure(BoxplotRequest(groups=[[1, 2, 3], [4, 5, 6]]))

    assert [trace["type"] for trace in fig.data] == ["scatter", "box", "scatter", "box"]
    assert fig.data[1]["fillcolor"] == "rgba(115,115,115,0.12)"
    assert fig.layout["yaxis"]["showgrid"] is True
    assert fig.layout["xaxis"]["ticktext"] == ["群1<br>(n = 3)", "群2<br>(n = 3)"]


def test_boxplot_auto_style_shows_individual_values_for_large_groups() -> None:
    groups = [list(range(50)), list(range(50, 100))]
    fig = boxplot_figure(BoxplotRequest(groups=groups))

    assert [trace["type"] for trace in fig.data] == ["scatter", "box", "scatter", "box"]
    assert fig.data[0]["marker"]["size"] == 5


def test_boxplot_style_options_are_applied() -> None:
    request = BoxplotRequest(
        groups=[[1, 2, 3], [4, 5, 6]],
        display_style="simple",
        color_mode="monochrome",
        show_n=False,
        show_grid=False,
        y_min=0,
        y_max=10,
    )
    fig = boxplot_figure(request)

    assert [trace["type"] for trace in fig.data] == ["box", "box"]
    assert fig.data[0]["fillcolor"] == "rgba(115,115,115,0.12)"
    assert fig.layout["xaxis"]["ticktext"] == ["群1", "群2"]
    assert fig.layout["yaxis"]["showgrid"] is False
    assert fig.layout["yaxis"]["range"] == [0.0, 10.0]


def test_boxplot_rejects_invalid_y_axis_range() -> None:
    with pytest.raises(ValidationError, match="最大値は最小値より大きく"):
        BoxplotRequest(groups=[[1, 2]], y_min=10, y_max=0)


def test_boxplot_two_group_comparison_adds_p_value_annotation() -> None:
    request = BoxplotRequest(
        groups=[[1, 2, 3, 4], [10, 11, 12, 13]],
        group_names=["対照群", "介入群"],
        show_comparison=True,
        comparison_method="parametric",
    )
    fig = boxplot_figure(request)

    assert len(fig.layout["shapes"]) == 3
    assert fig.layout["annotations"][0]["text"].startswith("p ")


def test_boxplot_multigroup_comparison_uses_adjusted_pairwise_results() -> None:
    from backend.services.graph.boxplot_comparison import compute_boxplot_comparison

    result = compute_boxplot_comparison(
        BoxplotRequest(
            groups=[[1, 2, 3, 4], [10, 11, 12, 13], [20, 21, 22, 23]],
            group_names=["A", "B", "C"],
            show_comparison=True,
            comparison_method="nonparametric",
        )
    )

    assert result is not None
    assert "Kruskal-Wallis" in result.method
    assert len(result.pairs) == 3
    assert result.omnibus_p_value is not None


def test_boxplot_three_groups_shows_every_pairwise_p_value_even_when_none_significant() -> None:
    # 3群でどのペアも有意でなくても、全体検定p値ではなくペアごとのp値を表示する
    request = BoxplotRequest(
        groups=[[5, 6, 7, 6, 5], [6, 5, 7, 6, 6], [5, 7, 6, 5, 6]],
        group_names=["通常ケア", "運動療法", "複合介入"],
        show_comparison=True,
        comparison_method="parametric",
    )
    fig = boxplot_figure(request)

    # 3ペア分のブラケット（各3本の線）= 9 shapes
    assert len(fig.layout["shapes"]) == 9
    texts = [a["text"] for a in fig.layout["annotations"]]
    assert len(texts) == 3
    assert all(t.startswith("p ") for t in texts)
    assert not any("全体" in t for t in texts)


def test_boxplot_four_groups_falls_back_to_overall_p_value_when_none_significant() -> None:
    # 4群以上はペアが多すぎるため、有意ペアが無ければ従来どおり全体検定p値にフォールバック
    request = BoxplotRequest(
        groups=[[5, 6, 7, 6, 5], [6, 5, 7, 6, 6], [5, 7, 6, 5, 6], [6, 6, 5, 7, 5]],
        group_names=["A", "B", "C", "D"],
        show_comparison=True,
        comparison_method="parametric",
    )
    fig = boxplot_figure(request)

    assert len(fig.layout["shapes"]) == 3  # 全体ブラケット1本のみ
    texts = [a["text"] for a in fig.layout["annotations"]]
    assert len(texts) == 1
    assert "全体" in texts[0]


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


def test_paired_plot_connects_each_pair() -> None:
    fig = paired_figure(PairedPlotRequest(before=[1, 2, 3], after=[2, 4, 6]))
    assert len(fig.data) == 3
    assert fig.data[0]["mode"] == "lines+markers"


def test_paired_plot_can_be_exported() -> None:
    from backend.services.graph.matplotlib_export import export_bytes

    data, mime = export_bytes(ExportRequest(
        chart_type="paired",
        format="png",
        width_inches=3.5,
        height_inches=3.2,
        paired=PairedPlotRequest(before=[1, 2, 3], after=[2, 4, 6]),
    ))
    assert mime == "image/png"
    assert data[:8] == b"\x89PNG\r\n\x1a\n"


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


def test_export_returns_json_500_for_unexpected_failure(monkeypatch) -> None:
    def unexpected_failure(_request: ExportRequest) -> tuple[bytes, str]:
        raise TypeError("internal implementation detail")

    monkeypatch.setattr(
        "backend.services.graph.matplotlib_export.export_bytes",
        unexpected_failure,
    )
    request = ExportRequest(
        chart_type="histogram",
        histogram=HistogramRequest(values=[1, 2, 3]),
    )

    with pytest.raises(HTTPException) as exc_info:
        graph.export(request)

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "論文出力の生成中に予期しないエラーが発生しました"


def test_boxplot_export_uses_current_matplotlib_tick_labels_api(monkeypatch) -> None:
    import matplotlib.axes

    original_boxplot = matplotlib.axes.Axes.boxplot
    calls: list[dict[str, object]] = []

    def recording_boxplot(self, *args, **kwargs):  # type: ignore[no-untyped-def]
        calls.append(kwargs)
        return original_boxplot(self, *args, **kwargs)

    monkeypatch.setattr(matplotlib.axes.Axes, "boxplot", recording_boxplot)
    from backend.services.graph.matplotlib_export import export_bytes

    data, mime = export_bytes(ExportRequest(
        chart_type="boxplot",
        format="png",
        boxplot=BoxplotRequest(
            groups=[[1, 2, 3], [3, 4, 5]],
            group_names=["対照群", "介入群"],
        ),
    ))

    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    assert mime == "image/png"
    assert calls[0]["tick_labels"] == ["対照群\n(n = 3)", "介入群\n(n = 3)"]
    assert "labels" not in calls[0]


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
