import math
import os

import pytest

os.environ["STATSEED_ENABLE_SCIPY"] = "1"

from pydantic import ValidationError

from backend.schemas.regression import LogisticRegressionRequest
from backend.services.stats.regression import run_logistic_regression


def _req(**kwargs) -> LogisticRegressionRequest:
    return LogisticRegressionRequest(**kwargs)


def _coef(result, name: str):
    return next(c for c in result.coefficients if c.name == name)


# ── 既知の答え（statsmodels Logit と一致） ────────────────────────────────────

def test_logistic_known_values() -> None:
    result = run_logistic_regression(_req(
        outcome=[0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0],
        predictors=[{"name": "x", "values": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]}],
    ))
    c = _coef(result, "x")
    assert c.coef == pytest.approx(1.301638, abs=1e-4)
    assert c.odds_ratio == pytest.approx(3.675313, abs=1e-3)
    assert c.or_ci95_low == pytest.approx(0.708356, abs=1e-3)
    assert c.or_ci95_high == pytest.approx(19.069405, abs=1e-2)
    assert c.p_value == pytest.approx(0.121262, abs=1e-4)
    assert result.pseudo_r_squared == pytest.approx(0.638027, abs=1e-4)
    assert result.lr_pvalue == pytest.approx(0.002939, abs=1e-4)
    assert result.n_used == 10
    assert result.n_events == 5
    # オッズ比 = exp(係数) の関係が保たれている
    assert c.odds_ratio == pytest.approx(math.exp(c.coef), rel=1e-9)


def test_logistic_interpretation_mentions_odds() -> None:
    result = run_logistic_regression(_req(
        outcome_name="再入院",
        outcome=[0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0],
        predictors=[{"name": "年齢", "values": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]}],
    ))
    assert "オッズ" in result.interpretation
    assert "再入院" in result.interpretation


# ── アウトカムのバリデーション ────────────────────────────────────────────────

def test_non_binary_outcome_raises() -> None:
    with pytest.raises(ValueError):
        run_logistic_regression(_req(
            outcome=[0.0, 1.0, 2.0, 1.0, 0.0],
            predictors=[{"name": "x", "values": [1.0, 2.0, 3.0, 4.0, 5.0]}],
        ))


def test_single_class_outcome_raises() -> None:
    with pytest.raises(ValueError):
        run_logistic_regression(_req(
            outcome=[1.0, 1.0, 1.0, 1.0, 1.0],
            predictors=[{"name": "x", "values": [1.0, 2.0, 3.0, 4.0, 5.0]}],
        ))


def test_missing_listwise_deletion() -> None:
    # 欠損除去後に分離しない（収束する）データ
    result = run_logistic_regression(_req(
        outcome=[0.0, None, 1.0, 0.0, 1.0, 1.0, 0.0],
        predictors=[{"name": "x", "values": [2.0, 9.0, 3.0, None, 5.0, 6.0, 4.0]}],
    ))
    assert result.n_total == 7
    assert result.n_used == 5
    assert result.n_excluded == 2
    assert result.n_events == 3


# ── 完全分離（収束しない/発散）はクリーンなエラーに ──────────────────────────

def test_perfect_separation_raises_valueerror() -> None:
    # x<=4 は全て0、x>=5 は全て1 という完全分離
    with pytest.raises(ValueError):
        run_logistic_regression(_req(
            outcome=[0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0],
            predictors=[{"name": "x", "values": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]}],
        ))


def test_constant_predictor_raises() -> None:
    with pytest.raises(ValueError):
        run_logistic_regression(_req(
            outcome=[0.0, 1.0, 0.0, 1.0, 1.0],
            predictors=[{"name": "x", "values": [3.0, 3.0, 3.0, 3.0, 3.0]}],
        ))


def test_length_mismatch_raises_validation() -> None:
    with pytest.raises(ValidationError):
        _req(
            outcome=[0.0, 1.0, 0.0],
            predictors=[{"name": "x", "values": [1.0, 2.0]}],
        )


# ── ルーターのHTTPコントラクト ────────────────────────────────────────────────

def test_router_maps_importerror_to_503(monkeypatch) -> None:
    from fastapi import HTTPException

    from backend.routers import regression as router

    def _boom(_req):
        raise ImportError("statsmodels missing")

    monkeypatch.setattr(router, "run_logistic_regression", _boom)
    req = _req(outcome=[0.0, 1.0, 0.0, 1.0], predictors=[{"name": "x", "values": [1.0, 2.0, 3.0, 4.0]}])
    with pytest.raises(HTTPException) as exc:
        router.logistic(req)
    assert exc.value.status_code == 503


def test_router_maps_valueerror_to_422() -> None:
    from fastapi import HTTPException

    from backend.routers import regression as router

    # 非2値アウトカム → サービスで ValueError → 422
    req = _req(outcome=[0.0, 2.0, 0.0, 1.0], predictors=[{"name": "x", "values": [1.0, 2.0, 3.0, 4.0]}])
    with pytest.raises(HTTPException) as exc:
        router.logistic(req)
    assert exc.value.status_code == 422
