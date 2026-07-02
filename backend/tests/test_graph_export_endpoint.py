"""グラフ編集パネルのオーバーライドパラメータが /api/graph/export エンドポイントを
通じて正しく機能することを検証する HTTP レベルのテスト。"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

_HIST_BASE = {
    "chart_type": "histogram",
    "format": "png",
    "histogram": {"values": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]},
}

_SCATTER_BASE = {
    "chart_type": "scatter",
    "format": "png",
    "scatter": {"x": [1, 2, 3, 4, 5], "y": [2, 4, 3, 5, 6]},
}

_BOXPLOT_BASE = {
    "chart_type": "boxplot",
    "format": "png",
    "boxplot": {"groups": [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]]},
}


def _post(payload: dict) -> tuple[int, bytes]:
    res = client.post("/api/graph/export", json=payload)
    return res.status_code, res.content


# --- タイトル・軸ラベルのオーバーライド ---

def test_endpoint_override_title_returns_png():
    payload = {**_HIST_BASE, "override_title": "エンドポイントタイトル"}
    status, body = _post(payload)
    assert status == 200
    assert len(body) > 0


def test_endpoint_override_x_label_returns_png():
    payload = {**_HIST_BASE, "override_x_label": "介入強度"}
    status, body = _post(payload)
    assert status == 200
    assert len(body) > 0


def test_endpoint_override_y_label_returns_png():
    payload = {**_HIST_BASE, "override_y_label": "頻度"}
    status, body = _post(payload)
    assert status == 200
    assert len(body) > 0


def test_endpoint_override_all_labels_returns_png():
    payload = {
        **_SCATTER_BASE,
        "override_title": "散布図タイトル",
        "override_x_label": "身長 (cm)",
        "override_y_label": "体重 (kg)",
    }
    status, body = _post(payload)
    assert status == 200
    assert len(body) > 0


# --- 軸範囲 ---

def test_endpoint_override_y_range_returns_png():
    payload = {**_BOXPLOT_BASE, "override_y_range": [0.0, 15.0]}
    status, body = _post(payload)
    assert status == 200
    assert len(body) > 0


def test_endpoint_override_x_range_on_scatter_returns_png():
    payload = {**_SCATTER_BASE, "override_x_range": [0.0, 6.0], "override_y_range": [0.0, 8.0]}
    status, body = _post(payload)
    assert status == 200
    assert len(body) > 0


def test_endpoint_invalid_y_range_returns_422():
    payload = {**_HIST_BASE, "override_y_range": [10.0, 2.0]}
    status, _ = _post(payload)
    assert status == 422


def test_endpoint_y_range_single_element_returns_422():
    payload = {**_HIST_BASE, "override_y_range": [1.0]}
    status, _ = _post(payload)
    assert status == 422


# --- 凡例の表示/非表示・位置 ---

def test_endpoint_hide_legend_returns_png():
    payload = {**_SCATTER_BASE, "override_show_legend": False}
    status, body = _post(payload)
    assert status == 200
    assert len(body) > 0


def test_endpoint_show_legend_with_position_returns_png():
    for pos in ("top-right", "top-left", "bottom-right", "bottom-left"):
        payload = {
            **_SCATTER_BASE,
            "scatter": {**_SCATTER_BASE["scatter"], "show_regression": True},
            "override_show_legend": True,
            "override_legend_position": pos,
        }
        status, body = _post(payload)
        assert status == 200, f"legend_position={pos} で失敗: status={status}"
        assert len(body) > 0


def test_endpoint_invalid_legend_position_returns_422():
    payload = {**_SCATTER_BASE, "override_legend_position": "center"}
    status, _ = _post(payload)
    assert status == 422


# --- 軸ラベルの文字サイズ・位置（standoff）---

def test_endpoint_override_label_size_returns_png():
    payload = {
        **_SCATTER_BASE,
        "override_x_label": "X軸",
        "override_y_label": "Y軸",
        "override_x_label_size": 12,
        "override_y_label_size": 12,
    }
    status, body = _post(payload)
    assert status == 200
    assert len(body) > 0


def test_endpoint_override_label_standoff_returns_png():
    payload = {
        **_SCATTER_BASE,
        "override_x_label": "X軸",
        "override_y_label": "Y軸",
        "override_x_label_standoff": 20.0,
        "override_y_label_standoff": 15.0,
    }
    status, body = _post(payload)
    assert status == 200
    assert len(body) > 0


def test_endpoint_label_size_too_small_returns_422():
    payload = {**_HIST_BASE, "override_x_label_size": 5}
    status, _ = _post(payload)
    assert status == 422


def test_endpoint_label_size_too_large_returns_422():
    payload = {**_HIST_BASE, "override_y_label_size": 37}
    status, _ = _post(payload)
    assert status == 422


def test_endpoint_label_standoff_negative_returns_422():
    payload = {**_HIST_BASE, "override_x_label_standoff": -1.0}
    status, _ = _post(payload)
    assert status == 422


def test_endpoint_label_standoff_over_max_returns_422():
    payload = {**_HIST_BASE, "override_y_label_standoff": 101.0}
    status, _ = _post(payload)
    assert status == 422


# --- SVG / PDF フォーマット ---

def test_endpoint_svg_format_returns_svg():
    payload = {**_HIST_BASE, "format": "svg"}
    res = client.post("/api/graph/export", json=payload)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/svg")


def test_endpoint_pdf_format_returns_pdf():
    payload = {**_HIST_BASE, "format": "pdf"}
    res = client.post("/api/graph/export", json=payload)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


# --- チャートタイプ不一致 ---

def test_endpoint_chart_type_mismatch_returns_422():
    # chart_type=scatter なのに scatter データがない
    payload = {
        "chart_type": "scatter",
        "format": "png",
        "histogram": {"values": [1, 2, 3, 4, 5]},
    }
    status, _ = _post(payload)
    assert status == 422
