import math
import os

import pytest

os.environ["STATSEED_ENABLE_SCIPY"] = "1"

from backend.schemas.test import (
    ChiSquareRequest,
    CorrelationRequest,
    MultiGroupRequest,
    PairedRequest,
    TwoGroupRequest,
)
from backend.services.stats.hypothesis import (
    run_anova,
    run_chisquare,
    run_correlation,
    run_fisher,
    run_kruskal,
    run_mannwhitney,
    run_ttest_ind,
    run_ttest_paired,
    run_wilcoxon,
)


# --- t検定（独立2群）---

def test_ttest_ind_known_difference() -> None:
    req = TwoGroupRequest(
        variable_name="握力",
        group_a=[10, 12, 14, 16, 18],
        group_b=[20, 22, 24, 26, 28],
        group_a_name="対照群",
        group_b_name="介入群",
    )
    result = run_ttest_ind(req)

    assert result.p_value < 0.05
    assert result.statistic is not None
    assert result.effect_size is not None and result.effect_size < -1.0
    assert result.ci95_high is not None and result.ci95_high < 0
    assert "有意差が認められました" in result.interpretation


def test_ttest_ind_no_difference() -> None:
    req = TwoGroupRequest(
        variable_name="体重",
        group_a=[50, 52, 54, 56, 58],
        group_b=[51, 53, 55, 57, 59],
    )
    result = run_ttest_ind(req)

    assert result.p_value > 0.05
    assert "有意差は認められませんでした" in result.interpretation


# --- Mann-Whitney U検定 ---

def test_mannwhitney_significant() -> None:
    req = TwoGroupRequest(
        variable_name="疼痛スコア",
        group_a=[1, 2, 2, 3, 3],
        group_b=[6, 7, 8, 8, 9],
    )
    result = run_mannwhitney(req)

    assert result.p_value < 0.05
    assert "有意差が認められました" in result.interpretation


# --- 対応t検定 ---

def test_ttest_paired_significant() -> None:
    req = PairedRequest(
        variable_name="血圧",
        before=[130, 135, 128, 142, 138],
        after=[120, 122, 118, 130, 125],
    )
    result = run_ttest_paired(req)

    assert result.p_value < 0.05
    assert result.ci95_high is not None and result.ci95_high > 0
    assert "有意差が認められました" in result.interpretation


def test_ttest_paired_length_mismatch() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        PairedRequest(variable_name="体重", before=[50, 60], after=[55])


# --- Wilcoxon符号順位検定 ---

def test_wilcoxon_significant() -> None:
    # n=5では同方向差分でも最小p=0.0625のためn=6を使用
    req = PairedRequest(
        variable_name="ROM",
        before=[80, 85, 78, 90, 88, 82],
        after=[95, 100, 93, 105, 102, 97],
    )
    result = run_wilcoxon(req)

    assert result.p_value < 0.05
    assert "有意差が認められました" in result.interpretation


# --- 一元配置ANOVA ---

def test_anova_three_groups() -> None:
    req = MultiGroupRequest(
        variable_name="筋力",
        groups=[[10, 12, 11], [20, 22, 21], [30, 32, 31]],
        group_names=["A群", "B群", "C群"],
    )
    result = run_anova(req)

    assert result.p_value < 0.05
    assert result.effect_size is not None and result.effect_size > 0.9
    assert "有意差が認められました" in result.interpretation


def test_anova_requires_three_groups() -> None:
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        MultiGroupRequest(variable_name="筋力", groups=[[1, 2], [3, 4]])


# --- Kruskal-Wallis検定 ---

def test_kruskal_significant() -> None:
    req = MultiGroupRequest(
        variable_name="FIM得点",
        groups=[[10, 11, 12], [20, 21, 22], [30, 31, 32]],
    )
    result = run_kruskal(req)

    assert result.p_value < 0.05
    assert "有意差が認められました" in result.interpretation


# --- χ²検定 ---

def test_chisquare_known() -> None:
    # 2x2 table: 独立性あり（Yates補正込みで χ²≒50.7）
    req = ChiSquareRequest(observed=[[50, 10], [10, 50]])
    result = run_chisquare(req)

    assert result.p_value < 0.05
    assert math.isclose(result.statistic or 0, 50.7, rel_tol=0.01)
    assert result.effect_size is not None
    assert "有意な関連が認められました" in result.interpretation


def test_chisquare_no_association() -> None:
    req = ChiSquareRequest(observed=[[25, 25], [25, 25]])
    result = run_chisquare(req)

    assert result.p_value > 0.05
    assert "有意な関連は認められませんでした" in result.interpretation


# --- Fisher正確検定 ---

def test_fisher_2x2() -> None:
    req = ChiSquareRequest(observed=[[8, 2], [1, 9]])
    result = run_fisher(req)

    assert result.p_value < 0.05
    assert result.statistic is not None and result.statistic > 1
    assert "有意な関連が認められました" in result.interpretation


def test_fisher_requires_2x2() -> None:
    req = ChiSquareRequest(observed=[[10, 5, 3], [2, 8, 4]])
    with pytest.raises(ValueError, match="2×2"):
        run_fisher(req)


# --- 相関 ---

def test_pearson_positive_correlation() -> None:
    req = CorrelationRequest(
        variable_x_name="身長",
        variable_y_name="体重",
        x=[150, 160, 165, 170, 175, 180],
        y=[50, 58, 62, 68, 72, 80],
        method="pearson",
    )
    result = run_correlation(req)

    assert result.p_value < 0.05
    assert result.r > 0.95
    assert result.ci95_low is not None and result.ci95_low > 0
    assert "正の相関" in result.interpretation


def test_spearman_correlation() -> None:
    req = CorrelationRequest(
        variable_x_name="順位A",
        variable_y_name="順位B",
        x=[1, 2, 3, 4, 5],
        y=[2, 1, 4, 3, 5],
        method="spearman",
    )
    result = run_correlation(req)

    assert result.r > 0
    assert result.ci95_low is None
    assert "Spearman" in result.method
