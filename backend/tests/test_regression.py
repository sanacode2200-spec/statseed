import os

import pytest

os.environ["STATSEED_ENABLE_SCIPY"] = "1"

from pydantic import ValidationError

from backend.schemas.regression import LinearRegressionRequest
from backend.services.stats.regression import run_linear_regression


def _req(**kwargs) -> LinearRegressionRequest:
    return LinearRegressionRequest(**kwargs)


def _coef(result, name: str):
    return next(c for c in result.coefficients if c.name == name)


# ── 単回帰（教科書的な既知の答え） ────────────────────────────────────────────
# x=[1..5], y=[2,4,5,4,5] → slope=0.6, intercept=2.2, R²=0.6

def test_simple_regression_known_values() -> None:
    result = run_linear_regression(_req(
        outcome_name="y",
        outcome=[2.0, 4.0, 5.0, 4.0, 5.0],
        predictors=[{"name": "x", "values": [1.0, 2.0, 3.0, 4.0, 5.0]}],
    ))
    assert result.n_used == 5
    assert _coef(result, "x").coef == pytest.approx(0.6, abs=1e-9)
    assert _coef(result, "（切片）").coef == pytest.approx(2.2, abs=1e-9)
    assert result.r_squared == pytest.approx(0.6, abs=1e-9)


def test_simple_regression_perfect_fit_standardized() -> None:
    # y = 3x + 1 を完全再現するデータ。標準偏回帰係数(=相関)は 1.0
    result = run_linear_regression(_req(
        outcome=[4.0, 7.0, 10.0, 13.0, 16.0],
        predictors=[{"name": "x", "values": [1.0, 2.0, 3.0, 4.0, 5.0]}],
    ))
    assert _coef(result, "x").coef == pytest.approx(3.0, abs=1e-9)
    assert result.r_squared == pytest.approx(1.0, abs=1e-9)
    assert _coef(result, "x").std_coef == pytest.approx(1.0, abs=1e-9)


# ── 重回帰（共変量調整） ──────────────────────────────────────────────────────

def test_multiple_regression_structure() -> None:
    result = run_linear_regression(_req(
        outcome_name="血圧",
        outcome=[120.0, 130.0, 125.0, 140.0, 135.0, 150.0, 145.0, 160.0],
        predictors=[
            {"name": "年齢", "values": [40.0, 45.0, 42.0, 50.0, 48.0, 55.0, 53.0, 60.0]},
            {"name": "BMI", "values": [22.0, 24.0, 23.0, 26.0, 25.0, 28.0, 27.0, 30.0]},
        ],
    ))
    # 切片 + 2説明変数 = 3係数
    assert len(result.coefficients) == 3
    assert result.df_model == 2
    assert _coef(result, "（切片）").std_coef is None
    assert _coef(result, "年齢").std_coef is not None
    assert 0.0 <= result.r_squared <= 1.0


# ── 欠損処理 ──────────────────────────────────────────────────────────────────

def test_listwise_deletion_counts() -> None:
    result = run_linear_regression(_req(
        outcome=[1.0, 2.0, None, 4.0, 5.0, 6.0],
        predictors=[{"name": "x", "values": [1.0, None, 3.0, 4.0, 5.0, 6.0]}],
    ))
    assert result.n_total == 6
    assert result.n_used == 4  # index 1,2 が欠損で除外
    assert result.n_excluded == 2


# ── エラー系 ──────────────────────────────────────────────────────────────────

def test_constant_predictor_raises() -> None:
    with pytest.raises(ValueError):
        run_linear_regression(_req(
            outcome=[1.0, 2.0, 3.0, 4.0],
            predictors=[{"name": "x", "values": [5.0, 5.0, 5.0, 5.0]}],
        ))


def test_insufficient_data_raises() -> None:
    # 説明変数2個には最低4件必要。3件では不足。
    with pytest.raises(ValueError):
        run_linear_regression(_req(
            outcome=[1.0, 2.0, 3.0],
            predictors=[
                {"name": "x1", "values": [1.0, 2.0, 3.0]},
                {"name": "x2", "values": [4.0, 5.0, 6.0]},
            ],
        ))


def test_length_mismatch_raises_validation() -> None:
    with pytest.raises(ValidationError):
        _req(
            outcome=[1.0, 2.0, 3.0],
            predictors=[{"name": "x", "values": [1.0, 2.0]}],
        )


def test_duplicate_predictor_names_raises() -> None:
    with pytest.raises(ValidationError):
        _req(
            outcome=[1.0, 2.0, 3.0, 4.0],
            predictors=[
                {"name": "x", "values": [1.0, 2.0, 3.0, 4.0]},
                {"name": "x", "values": [4.0, 3.0, 2.0, 1.0]},
            ],
        )
