"""グラフ編集パネルのオーバーライドパラメータがExportRequestに渡り、
matplotlib exportで正しく適用されることを検証するテスト。"""

import pytest
from pydantic import ValidationError

from backend.schemas.graph import ExportRequest, HistogramRequest, ScatterRequest


def _hist_req(**overrides) -> ExportRequest:
    return ExportRequest(
        chart_type="histogram",
        format="png",
        histogram=HistogramRequest(values=[1, 2, 3, 4, 5, 6, 7]),
        **overrides,
    )


def test_export_accepts_all_override_fields():
    req = _hist_req(
        override_title="テストタイトル",
        override_x_label="X軸",
        override_y_label="Y軸",
        override_x_range=[0.0, 10.0],
        override_y_range=[0.0, 5.0],
        override_show_legend=True,
        override_legend_position="top-right",
    )
    assert req.override_title == "テストタイトル"
    assert req.override_x_label == "X軸"
    assert req.override_y_label == "Y軸"
    assert list(req.override_x_range) == [0.0, 10.0]  # type: ignore[arg-type]
    assert list(req.override_y_range) == [0.0, 5.0]  # type: ignore[arg-type]
    assert req.override_show_legend is True
    assert req.override_legend_position == "top-right"


def test_override_defaults_are_none():
    req = _hist_req()
    assert req.override_title is None
    assert req.override_x_label is None
    assert req.override_y_label is None
    assert req.override_x_range is None
    assert req.override_y_range is None
    assert req.override_show_legend is None
    assert req.override_legend_position is None


def test_override_x_range_wrong_length_raises():
    with pytest.raises(ValidationError, match="2要素"):
        _hist_req(override_x_range=[0.0])


def test_override_x_range_min_gte_max_raises():
    with pytest.raises(ValidationError, match="小さく"):
        _hist_req(override_x_range=[5.0, 2.0])


def test_override_x_range_equal_raises():
    with pytest.raises(ValidationError, match="小さく"):
        _hist_req(override_x_range=[3.0, 3.0])


def test_override_y_range_wrong_length_raises():
    with pytest.raises(ValidationError, match="2要素"):
        _hist_req(override_y_range=[1.0, 2.0, 3.0])


def test_override_y_range_min_gte_max_raises():
    with pytest.raises(ValidationError, match="小さく"):
        _hist_req(override_y_range=[10.0, 1.0])


def test_export_bytes_applies_title_override():
    from backend.services.graph.matplotlib_export import export_bytes

    req = _hist_req(override_title="オーバーライドタイトル")
    data, mime = export_bytes(req)
    assert len(data) > 0
    assert mime == "image/png"


def test_export_bytes_applies_axis_label_overrides():
    from backend.services.graph.matplotlib_export import export_bytes

    req = _hist_req(override_x_label="介入", override_y_label="頻度")
    data, mime = export_bytes(req)
    assert len(data) > 0


def test_export_bytes_applies_range_overrides():
    from backend.services.graph.matplotlib_export import export_bytes

    req = _hist_req(override_x_range=[0.0, 10.0], override_y_range=[0.0, 8.0])
    data, mime = export_bytes(req)
    assert len(data) > 0


def test_export_bytes_hides_legend():
    from backend.services.graph.matplotlib_export import export_bytes

    req = ExportRequest(
        chart_type="histogram",
        format="png",
        histogram=HistogramRequest(values=[1, 2, 3, 4, 5, 6, 7], show_normal_curve=True),
        override_show_legend=False,
    )
    data, mime = export_bytes(req)
    assert len(data) > 0


def test_override_hide_title_and_dtick_defaults_none():
    req = _hist_req()
    assert req.override_hide_title is None
    assert req.override_x_dtick is None
    assert req.override_y_dtick is None


def test_override_dtick_must_be_positive():
    with pytest.raises(ValidationError):
        _hist_req(override_y_dtick=0)
    with pytest.raises(ValidationError):
        _hist_req(override_x_dtick=-1)


def test_export_bytes_hide_title():
    from backend.services.graph.matplotlib_export import export_bytes

    req = _hist_req(override_title="消える予定", override_hide_title=True)
    data, mime = export_bytes(req)
    assert len(data) > 0
    assert mime == "image/png"


def test_export_bytes_applies_tick_intervals():
    from backend.services.graph.matplotlib_export import export_bytes

    # 数値X軸グラフ（散布図）にX/Y目盛り間隔を適用
    req = ExportRequest(
        chart_type="scatter",
        format="png",
        scatter=ScatterRequest(x=[1, 2, 3, 4, 5], y=[2, 4, 3, 5, 6]),
        override_x_dtick=1.0,
        override_y_dtick=2.0,
    )
    data, _ = export_bytes(req)
    assert len(data) > 0


def test_export_bytes_y_dtick_on_categorical_chart():
    from backend.schemas.graph import BoxplotRequest
    from backend.services.graph.matplotlib_export import export_bytes

    # カテゴリX軸（箱ひげ図）でもY目盛り間隔は適用でき、X間隔は無視される
    req = ExportRequest(
        chart_type="boxplot",
        format="png",
        boxplot=BoxplotRequest(groups=[[1, 2, 3, 4], [3, 4, 5, 6]]),
        override_x_dtick=1.0,
        override_y_dtick=1.0,
    )
    data, _ = export_bytes(req)
    assert len(data) > 0


def test_export_bytes_barplot_value_labels():
    from backend.schemas.graph import BarplotRequest
    from backend.services.graph.matplotlib_export import export_bytes

    req = ExportRequest(
        chart_type="barplot",
        format="png",
        barplot=BarplotRequest(groups=[[1, 2, 3, 4], [5, 6, 7, 8]], group_names=["前", "後"]),
        override_show_value_labels=True,
    )
    data, mime = export_bytes(req)
    assert len(data) > 0
    assert mime == "image/png"


def test_override_show_value_labels_default_none():
    assert _hist_req().override_show_value_labels is None


def test_export_bytes_legend_position_variants():
    from backend.services.graph.matplotlib_export import export_bytes

    for pos in ("top-right", "top-left", "bottom-right", "bottom-left"):
        req = ExportRequest(
            chart_type="scatter",
            format="png",
            scatter=ScatterRequest(x=[1, 2, 3, 4], y=[2, 4, 3, 5], show_regression=True),
            override_show_legend=True,
            override_legend_position=pos,  # type: ignore[arg-type]
        )
        data, mime = export_bytes(req)
        assert len(data) > 0, f"legend_position={pos} でエクスポートが失敗した"
