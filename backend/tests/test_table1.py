import os

import pytest

os.environ["STATSEED_ENABLE_SCIPY"] = "1"

from pydantic import ValidationError

from backend.schemas.table1 import Table1Request
from backend.services.stats.table1 import build_table1


def _req(**kwargs):
    return Table1Request(**kwargs)


# ── スキーマ検証 ──────────────────────────────────────────────────────────────

def test_group_length_mismatch_raises() -> None:
    with pytest.raises(ValidationError):
        _req(
            variables=[{"name": "年齢", "type": "continuous", "values": [20, 30]}],
            group_values=["A", "B", "C"],
        )


def test_single_continuous_no_group() -> None:
    req = _req(variables=[{"name": "年齢", "type": "continuous", "values": [20.0, 30.0, 40.0]}])
    result = build_table1(req)
    assert result.n_overall == 3
    assert result.group_names is None
    assert len(result.rows) == 1
    row = result.rows[0]
    assert row.variable == "年齢"
    assert "±" in row.overall


def test_continuous_median_iqr_display() -> None:
    req = _req(
        variables=[{"name": "BMI", "type": "continuous", "values": [18.0, 22.0, 25.0, 30.0], "display": "median_iqr"}]
    )
    result = build_table1(req)
    assert "(" in result.rows[0].overall
    assert "–" in result.rows[0].overall


def test_continuous_with_missing_values() -> None:
    req = _req(
        variables=[{"name": "身長", "type": "continuous", "values": [160.0, None, 170.0]}]
    )
    result = build_table1(req)
    assert "165.0" in result.rows[0].overall
    assert result.rows[0].missing == 1


def test_single_categorical_no_group() -> None:
    req = _req(
        variables=[{"name": "性別", "type": "categorical", "values": ["男", "女", "男", "女", "男"]}]
    )
    result = build_table1(req)
    assert result.rows[0].variable == "性別"
    labels = [r.variable for r in result.rows if r.indent]
    assert "男" in labels and "女" in labels
    assert result.rows[0].overall == "n = 5"


def test_continuous_with_two_groups() -> None:
    req = _req(
        variables=[{"name": "年齢", "type": "continuous", "values": [20.0, 30.0, 40.0, 50.0]}],
        group_values=["A", "A", "B", "B"],
        show_pvalue=True,
    )
    result = build_table1(req)
    row = result.rows[0]
    assert row.groups is not None
    assert "A" in row.groups and "B" in row.groups
    assert row.p_value is not None
    assert row.test_name == "Mann-Whitney U"


def test_continuous_with_three_groups() -> None:
    req = _req(
        variables=[{"name": "体重", "type": "continuous", "values": [50.0, 60.0, 70.0, 80.0, 90.0, 100.0]}],
        group_values=["A", "A", "B", "B", "C", "C"],
        show_pvalue=True,
    )
    result = build_table1(req)
    assert result.rows[0].test_name == "Kruskal-Wallis"


def test_categorical_with_groups_has_pvalue() -> None:
    req = _req(
        variables=[{"name": "性別", "type": "categorical", "values": ["男", "女", "男", "女"]}],
        group_values=["A", "A", "B", "B"],
        show_pvalue=True,
    )
    result = build_table1(req)
    header = result.rows[0]
    assert header.p_value is not None


def test_mixed_variables() -> None:
    req = _req(
        variables=[
            {"name": "年齢", "type": "continuous", "values": [20.0, 30.0, 40.0, 50.0]},
            {"name": "性別", "type": "categorical", "values": ["男", "女", "男", "女"]},
        ],
        group_values=["A", "A", "B", "B"],
    )
    result = build_table1(req)
    assert result.group_names == ["A", "B"]
    assert result.n_by_group == {"A": 2, "B": 2}
    assert len(result.rows) >= 2


def test_group_missing_is_reported() -> None:
    req = _req(
        variables=[{"name": "年齢", "type": "continuous", "values": [20.0, None, 40.0]}],
        group_values=["A", None, "B"],
    )
    result = build_table1(req)
    assert result.group_missing == 1
    assert result.rows[0].missing == 1


def test_p_value_format_less_than_001() -> None:
    req = _req(
        variables=[{"name": "x", "type": "continuous", "values": [1.0] * 50 + [100.0] * 50}],
        group_values=["A"] * 50 + ["B"] * 50,
        show_pvalue=True,
    )
    result = build_table1(req)
    assert result.rows[0].p_value == "<0.001"


# ── p値の既定オフ ─────────────────────────────────────────────────────────────

def test_pvalue_off_by_default() -> None:
    req = _req(
        variables=[{"name": "年齢", "type": "continuous", "values": [20.0, 30.0, 40.0, 50.0]}],
        group_values=["A", "A", "B", "B"],
    )
    result = build_table1(req)
    assert result.rows[0].p_value is None
    assert result.rows[0].test_name is None


# ── 標準化平均差（SMD） ───────────────────────────────────────────────────────

def test_smd_on_by_default_for_two_groups() -> None:
    req = _req(
        variables=[{"name": "年齢", "type": "continuous", "values": [20.0, 30.0, 40.0, 50.0]}],
        group_values=["A", "A", "B", "B"],
    )
    result = build_table1(req)
    assert result.rows[0].smd is not None


def test_smd_continuous_value() -> None:
    # A=[10,20] mean=15 var=50; B=[30,40] mean=35 var=50
    # pooled SD = sqrt((50+50)/2)=sqrt(50)=7.0711; SMD=|15-35|/7.0711=2.83
    # SMDは絶対値（非負の効果量）で報告する。
    req = _req(
        variables=[{"name": "x", "type": "continuous", "values": [10.0, 20.0, 30.0, 40.0]}],
        group_values=["A", "A", "B", "B"],
    )
    result = build_table1(req)
    assert result.rows[0].smd == "2.83"


def test_smd_binary_categorical_value() -> None:
    # 参照カテゴリは最頻の陰性。A: 陰性2/4=0.5, B: 陰性4/4=1.0
    # denom=(0.5*0.5 + 0)/2=0.125; SMD=|0.5-1.0|/sqrt(0.125)=1.41（絶対値）
    req = _req(
        variables=[{"name": "結果", "type": "categorical",
                    "values": ["陽性", "陽性", "陰性", "陰性", "陰性", "陰性", "陰性", "陰性"]}],
        group_values=["A", "A", "A", "A", "B", "B", "B", "B"],
    )
    result = build_table1(req)
    assert result.rows[0].smd == "1.41"


def test_smd_multinomial_three_categories() -> None:
    # 3カテゴリの多項SMD（Yang & Dalton 2012）。
    # A: a3,b1,c1 / B: a1,b1,c3 → 既知の答え ≈ 1.00
    from backend.services.stats.table1 import _smd_categorical

    smd = _smd_categorical([3, 1, 1], [1, 1, 3])
    assert smd == pytest.approx(1.0, abs=1e-6)
    # 群間で分布が一致 → 偏り0
    assert _smd_categorical([2, 2, 2], [3, 3, 3]) == pytest.approx(0.0, abs=1e-9)


def test_smd_multinomial_complete_separation_is_none() -> None:
    # 完全分離（有限のSMDが定義できない）は 0 ではなく未算出(None)とする
    from backend.services.stats.table1 import _smd_categorical

    assert _smd_categorical([5, 0, 0], [0, 0, 5]) is None


def test_smd_multinomial_via_build_table1() -> None:
    # build_table1 経由でも多項SMDが算出される（非負）
    req = _req(
        variables=[{"name": "血液型", "type": "categorical",
                    "values": ["A", "A", "A", "B", "O",
                               "A", "B", "O", "O", "O"]}],
        group_values=["G1", "G1", "G1", "G1", "G1",
                      "G2", "G2", "G2", "G2", "G2"],
    )
    result = build_table1(req)
    smd = result.rows[0].smd
    assert smd is not None
    assert float(smd) >= 0.0


def test_smd_off_when_disabled() -> None:
    req = _req(
        variables=[{"name": "年齢", "type": "continuous", "values": [20.0, 30.0, 40.0, 50.0]}],
        group_values=["A", "A", "B", "B"],
        show_smd=False,
    )
    result = build_table1(req)
    assert result.rows[0].smd is None


def test_smd_none_for_three_groups() -> None:
    req = _req(
        variables=[{"name": "体重", "type": "continuous", "values": [50.0, 60.0, 70.0, 80.0, 90.0, 100.0]}],
        group_values=["A", "A", "B", "B", "C", "C"],
    )
    result = build_table1(req)
    assert result.rows[0].smd is None
