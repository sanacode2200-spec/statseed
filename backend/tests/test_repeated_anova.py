import os

import pytest

os.environ["STATSEED_ENABLE_SCIPY"] = "1"

from pydantic import ValidationError

from backend.schemas.test import RepeatedMeasuresRequest
from backend.services.stats.hypothesis import run_repeated_anova


def _req(**kwargs) -> RepeatedMeasuresRequest:
    return RepeatedMeasuresRequest(**kwargs)


# ── 既知の答え（statsmodels AnovaRM と一致） ──────────────────────────────────
# 4対象 × 3条件 → F = 241.8, df = (2, 6), p ≈ 2e-6

def test_repeated_anova_known_values() -> None:
    result = run_repeated_anova(_req(
        variable_name="握力",
        conditions=[
            {"name": "C1", "values": [10.0, 12.0, 14.0, 16.0]},
            {"name": "C2", "values": [12.0, 15.0, 16.0, 18.0]},
            {"name": "C3", "values": [15.0, 18.0, 20.0, 22.0]},
        ],
    ))
    assert result.f_statistic == pytest.approx(241.8, abs=0.1)
    assert result.df_num == pytest.approx(2.0)
    assert result.df_den == pytest.approx(6.0)
    assert result.p_value < 0.001
    assert result.n_subjects == 4
    assert result.n_excluded == 0
    assert result.condition_means["C1"] == pytest.approx(13.0)
    assert result.condition_means["C3"] == pytest.approx(18.75)


def test_repeated_anova_interpretation() -> None:
    result = run_repeated_anova(_req(
        conditions=[
            {"name": "前", "values": [10.0, 12.0, 14.0, 16.0]},
            {"name": "中", "values": [12.0, 15.0, 16.0, 18.0]},
            {"name": "後", "values": [15.0, 18.0, 20.0, 22.0]},
        ],
    ))
    assert "反復測定" in result.interpretation
    assert "球面性" in result.interpretation


# ── 完全ケースのみ使用（欠損のある対象は除外） ────────────────────────────────

def test_repeated_anova_listwise_excludes_incomplete_subjects() -> None:
    result = run_repeated_anova(_req(
        conditions=[
            {"name": "C1", "values": [10.0, 12.0, 14.0, 16.0, 11.0]},
            {"name": "C2", "values": [12.0, 15.0, 16.0, 18.0, None]},
            {"name": "C3", "values": [15.0, 18.0, 20.0, 22.0, 13.0]},
        ],
    ))
    # 5人目はC2が欠損 → 除外、4人で解析
    assert result.n_subjects == 4
    assert result.n_excluded == 1


# ── バリデーション ────────────────────────────────────────────────────────────

def test_repeated_anova_length_mismatch_raises() -> None:
    with pytest.raises(ValidationError):
        _req(conditions=[
            {"name": "C1", "values": [10.0, 12.0, 14.0]},
            {"name": "C2", "values": [12.0, 15.0]},
            {"name": "C3", "values": [15.0, 18.0, 20.0]},
        ])


def test_repeated_anova_requires_three_conditions() -> None:
    with pytest.raises(ValidationError):
        _req(conditions=[
            {"name": "C1", "values": [10.0, 12.0, 14.0]},
            {"name": "C2", "values": [12.0, 15.0, 16.0]},
        ])


def test_repeated_anova_duplicate_condition_names_raises() -> None:
    with pytest.raises(ValidationError):
        _req(conditions=[
            {"name": "C1", "values": [10.0, 12.0, 14.0]},
            {"name": "C1", "values": [12.0, 15.0, 16.0]},
            {"name": "C3", "values": [15.0, 18.0, 20.0]},
        ])


def test_repeated_anova_no_variance_raises() -> None:
    with pytest.raises(ValueError):
        run_repeated_anova(_req(
            conditions=[
                {"name": "C1", "values": [5.0, 5.0, 5.0, 5.0]},
                {"name": "C2", "values": [5.0, 5.0, 5.0, 5.0]},
                {"name": "C3", "values": [5.0, 5.0, 5.0, 5.0]},
            ],
        ))


def test_repeated_anova_router_503(monkeypatch) -> None:
    from fastapi import HTTPException
    from backend.routers import test as router

    def _boom():
        raise ImportError("statsmodels missing")

    # _run_or_422 経由で ImportError -> 503 になることを確認
    with pytest.raises(HTTPException) as exc:
        router._run_or_422(_boom)
    assert exc.value.status_code == 503
