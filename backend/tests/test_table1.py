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
    )
    result = build_table1(req)
    assert result.rows[0].test_name == "Kruskal-Wallis"


def test_categorical_with_groups_has_pvalue() -> None:
    req = _req(
        variables=[{"name": "性別", "type": "categorical", "values": ["男", "女", "男", "女"]}],
        group_values=["A", "A", "B", "B"],
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


def test_p_value_format_less_than_001() -> None:
    req = _req(
        variables=[{"name": "x", "type": "continuous", "values": [1.0] * 50 + [100.0] * 50}],
        group_values=["A"] * 50 + ["B"] * 50,
    )
    result = build_table1(req)
    assert result.rows[0].p_value == "<0.001"
