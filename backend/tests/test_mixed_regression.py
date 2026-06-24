import os

import pytest

os.environ["STATSEED_ENABLE_SCIPY"] = "1"

from backend.schemas.regression import MixedModelRequest
from backend.services.stats.regression import run_mixed_model


def _req(**kwargs) -> MixedModelRequest:
    return MixedModelRequest(**kwargs)


def _coef(result, name: str):
    return next(c for c in result.coefficients if c.name == name)


# ── ランダム切片付き混合モデル（既知の答え：R lme4 と statsmodels で突合済み） ───
# y ~ time + (1|group)。group=P1..P8（各5時点）。
# R: lmer(y ~ time + (1|group), REML=TRUE) と完全一致を確認済み
# (Intercept)=9.4142, time=1.4449, group var=8.990, residual var=1.353

_Y = [
    10.8889, 11.1346, 15.2332, 16.5808, 17.0132,
    8.5709, 9.0813, 8.5911, 11.9332, 11.4417,
    13.569, 13.6765, 14.9741, 15.73, 20.0852,
    12.5899, 13.6792, 15.2935, 18.1202, 19.3699,
    4.766, 6.2931, 10.3594, 8.0373, 9.3785,
    4.8728, 8.5174, 10.7869, 10.4225, 10.8332,
    9.1468, 12.8594, 14.4984, 15.6983, 15.3853,
    9.3995, 10.7263, 12.3793, 14.8584, 15.3867,
]
_TIME = [0.0, 1.0, 2.0, 3.0, 4.0] * 8
_GROUP = [g for g in ("P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8") for _ in range(5)]


def test_mixed_known_values() -> None:
    result = run_mixed_model(_req(
        outcome_name="スコア",
        outcome=_Y,
        predictors=[{"name": "time", "values": _TIME}],
        group_name="患者ID",
        group=_GROUP,
    ))
    intercept = _coef(result, "（切片）")
    time_coef = _coef(result, "time")

    assert intercept.coef == pytest.approx(9.41424, abs=1e-3)
    assert intercept.std_err == pytest.approx(1.10690, abs=1e-3)
    assert intercept.ci95_low == pytest.approx(7.24475, abs=1e-3)
    assert intercept.ci95_high == pytest.approx(11.58373, abs=1e-3)

    assert time_coef.coef == pytest.approx(1.44490, abs=1e-3)
    assert time_coef.std_err == pytest.approx(0.13006, abs=1e-3)
    assert time_coef.p_value == pytest.approx(1.132e-28, rel=1e-2)
    assert time_coef.ci95_low == pytest.approx(1.18998, abs=1e-3)
    assert time_coef.ci95_high == pytest.approx(1.69982, abs=1e-3)

    assert result.group_var == pytest.approx(8.98988, abs=1e-3)
    assert result.resid_var == pytest.approx(1.35333, abs=1e-3)
    assert result.icc == pytest.approx(8.98988 / (8.98988 + 1.35333), abs=1e-3)
    assert result.log_likelihood == pytest.approx(-76.06813, abs=1e-2)
    assert result.converged is True
    assert result.n_groups == 8
    assert result.n_used == 40
    assert result.n_excluded == 0


def test_mixed_listwise_deletion() -> None:
    y = list(_Y)
    time = list(_TIME)
    group = list(_GROUP)
    y[0] = None
    time[5] = None
    group[10] = None
    result = run_mixed_model(_req(
        outcome=y,
        predictors=[{"name": "time", "values": time}],
        group=group,
    ))
    assert result.n_total == 40
    assert result.n_excluded == 3
    assert result.n_used == 37


def test_mixed_too_few_groups_raises() -> None:
    with pytest.raises(ValueError):
        run_mixed_model(_req(
            outcome=_Y,
            predictors=[{"name": "time", "values": _TIME}],
            group=["A" if g in ("P1", "P2", "P3", "P4") else "B" for g in _GROUP],
        ))


def test_mixed_single_obs_per_group_raises() -> None:
    n = len(_Y)
    with pytest.raises(ValueError):
        run_mixed_model(_req(
            outcome=_Y,
            predictors=[{"name": "time", "values": _TIME}],
            group=[f"G{i}" for i in range(n)],
        ))


def test_mixed_constant_predictor_raises() -> None:
    with pytest.raises(ValueError):
        run_mixed_model(_req(
            outcome=_Y,
            predictors=[{"name": "const", "values": [1.0] * len(_Y)}],
            group=_GROUP,
        ))


def test_mixed_group_name_mismatch_raises() -> None:
    with pytest.raises(Exception):
        _req(
            outcome=_Y,
            predictors=[{"name": "time", "values": _TIME}],
            group=_GROUP[:-1],
        )


def test_mixed_router_503(monkeypatch) -> None:
    from fastapi import HTTPException
    from backend.routers import regression as router

    def _boom(_req):
        raise ImportError("statsmodels missing")

    monkeypatch.setattr(router, "run_mixed_model", _boom)
    req = _req(outcome=_Y, predictors=[{"name": "time", "values": _TIME}], group=_GROUP)
    with pytest.raises(HTTPException) as exc:
        router.mixed(req)
    assert exc.value.status_code == 503


def test_mixed_router_422() -> None:
    from fastapi import HTTPException
    from backend.routers import regression as router

    req = _req(
        outcome=_Y,
        predictors=[{"name": "time", "values": _TIME}],
        group=["A" if g in ("P1", "P2", "P3", "P4") else "B" for g in _GROUP],
    )
    with pytest.raises(HTTPException) as exc:
        router.mixed(req)
    assert exc.value.status_code == 422
