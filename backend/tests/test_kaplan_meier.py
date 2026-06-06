import os

import pytest
from pydantic import ValidationError

os.environ["STATSEED_ENABLE_SCIPY"] = "1"

from backend.schemas.graph import KaplanMeierRequest
from backend.services.graph.kaplan_meier import km_fit, logrank_p, parse_groups
from backend.services.graph.plotly_charts import km_figure


# ── km_fit ────────────────────────────────────────────────────────────────────

def test_km_fit_starts_at_one() -> None:
    curve = km_fit([1, 2, 3, 4, 5], [1, 1, 0, 1, 1])
    assert curve.step_surv[0] == 1.0
    assert curve.step_times[0] == 0.0


def test_km_fit_surv_decreases() -> None:
    curve = km_fit([1, 2, 3, 4], [1, 1, 1, 1])
    for a, b in zip(curve.step_surv, curve.step_surv[1:]):
        assert a >= b


def test_km_fit_known_values() -> None:
    # 4人、全員イベント
    # t=1: n=4 d=1 → S=3/4=0.75
    # t=2: n=3 d=1 → S=0.75*2/3=0.5
    # t=3: n=2 d=1 → S=0.5*1/2=0.25
    # t=4: n=1 d=1 → S=0.25*0=0.0
    curve = km_fit([1.0, 2.0, 3.0, 4.0], [1, 1, 1, 1])
    assert curve.step_surv == pytest.approx([1.0, 0.75, 0.5, 0.25, 0.0])


def test_km_fit_censor_marks() -> None:
    curve = km_fit([1.0, 2.0, 3.0], [1, 0, 1])
    assert 2.0 in curve.censor_times
    assert len(curve.censor_times) == 1


def test_km_fit_ci_within_bounds() -> None:
    curve = km_fit([1, 2, 3, 4, 5, 6, 7, 8], [1, 1, 0, 1, 0, 1, 1, 0])
    for l, u in zip(curve.ci_lower, curve.ci_upper):
        assert 0.0 <= l <= 1.0
        assert 0.0 <= u <= 1.0
        assert l <= u


def test_km_fit_risk_counts_decrease() -> None:
    curve = km_fit([1, 2, 3, 4, 5], [1, 0, 1, 0, 1])
    for a, b in zip(curve.risk_counts, curve.risk_counts[1:]):
        assert a >= b


# ── logrank_p ────────────────────────────────────────────────────────────────

def test_logrank_clearly_different_groups() -> None:
    group_a = ([1, 2, 3, 4, 5], [1, 1, 1, 1, 1])
    group_b = ([10, 20, 30, 40, 50], [1, 1, 1, 1, 1])
    p = logrank_p([group_a, group_b])
    assert p is not None and p < 0.05


def test_logrank_identical_groups() -> None:
    g = ([1, 2, 3, 4, 5], [1, 1, 0, 1, 0])
    p = logrank_p([g, g])
    assert p is not None and p > 0.05


def test_logrank_returns_none_for_single_group() -> None:
    assert logrank_p([([1, 2, 3], [1, 0, 1])]) is None


# ── parse_groups ─────────────────────────────────────────────────────────────

def test_parse_groups_no_labels() -> None:
    curves = parse_groups([1.0, 2.0, 3.0], [1, 0, 1], None)
    assert len(curves) == 1


def test_parse_groups_two_groups() -> None:
    times = [1, 2, 3, 4]
    events = [1, 1, 1, 1]
    labels = ["A", "A", "B", "B"]
    curves = parse_groups(times, events, labels)
    assert len(curves) == 2
    names = {c.name for c in curves}
    assert names == {"A", "B"}


# ── km_figure (Plotly) ────────────────────────────────────────────────────────

def test_km_figure_returns_plotly_figure() -> None:
    req = KaplanMeierRequest(times=[1, 2, 3, 4, 5], events=[1, 0, 1, 0, 1])
    fig = km_figure(req)
    assert len(fig.data) > 0


def test_km_figure_two_groups_has_logrank_annotation() -> None:
    req = KaplanMeierRequest(
        times=[1, 2, 10, 20, 30],
        events=[1, 1, 1, 1, 1],
        group_labels=["A", "A", "B", "B", "B"],
    )
    fig = km_figure(req)
    annotations = fig.layout.get("annotations", [])
    texts = [a.get("text", "") for a in annotations]
    assert any("ログランク" in t for t in texts)


# ── schema validation ─────────────────────────────────────────────────────────

def test_km_schema_rejects_length_mismatch() -> None:
    with pytest.raises(ValidationError, match="長さが一致しません"):
        KaplanMeierRequest(times=[1, 2, 3], events=[1, 0])


def test_km_schema_rejects_invalid_event() -> None:
    with pytest.raises(ValidationError, match="0.*1"):
        KaplanMeierRequest(times=[1.0, 2.0], events=[1, 2])


def test_km_schema_rejects_negative_time() -> None:
    with pytest.raises(ValidationError, match="0 以上"):
        KaplanMeierRequest(times=[-1.0, 2.0], events=[1, 0])
