import math
import os
import statistics

from backend.schemas.table1 import (
    CategoricalVariable,
    ContinuousVariable,
    Table1Request,
    Table1Result,
    Table1Row,
)

_MISSING = {"", "na", "-"}


def build_table1(request: Table1Request) -> Table1Result:
    group_map = _build_group_map(request)
    group_names = sorted(group_map.keys()) if group_map is not None else None

    n_overall = _count_all(request)
    n_by_group: dict[str, int] | None = None
    if group_map is not None and group_names is not None:
        n_by_group = {g: len(group_map[g]) for g in group_names}

    rows: list[Table1Row] = []
    for var in request.variables:
        if isinstance(var, ContinuousVariable):
            rows.extend(_continuous_rows(var, group_map, group_names))
        else:
            rows.extend(_categorical_rows(var, group_map, group_names))

    return Table1Result(
        rows=rows,
        group_names=group_names,
        n_overall=n_overall,
        n_by_group=n_by_group,
        group_missing=(
            len(request.group_values) - sum(len(indices) for indices in group_map.values())
            if request.group_values is not None and group_map is not None
            else 0
        ),
    )


# ── グループマップ構築 ──────────────────────────────────────────────────────

def _build_group_map(request: Table1Request) -> dict[str, list[int]] | None:
    """group_values が指定されていれば {group_label: [index, ...]} を返す"""
    if request.group_values is None:
        return None
    group_map: dict[str, list[int]] = {}
    for i, label in enumerate(request.group_values):
        if label is None or label.strip() == "":
            continue
        key = label.strip()
        group_map.setdefault(key, []).append(i)
    return group_map


def _count_all(request: Table1Request) -> int:
    if not request.variables:
        return 0
    return len(request.variables[0].values)


# ── 連続変数 ────────────────────────────────────────────────────────────────

def _continuous_rows(
    var: ContinuousVariable,
    group_map: dict[str, list[int]] | None,
    group_names: list[str] | None,
) -> list[Table1Row]:
    all_vals = _clean_continuous(var.values)
    overall = _fmt_continuous(all_vals, var.display)

    groups: dict[str, str] | None = None
    missing_by_group: dict[str, int] | None = None
    p_value: str | None = None
    test_name: str | None = None

    if group_map is not None and group_names is not None:
        group_data = {
            g: _clean_continuous([var.values[i] for i in idxs])
            for g, idxs in group_map.items()
        }
        groups = {g: _fmt_continuous(group_data[g], var.display) for g in group_names}
        missing_by_group = {
            g: len(group_map[g]) - len(group_data[g]) for g in group_names
        }
        p_value, test_name = _continuous_pvalue(
            [group_data[g] for g in group_names]
        )

    return [Table1Row(
        variable=var.name,
        overall=overall,
        groups=groups,
        p_value=p_value,
        test_name=test_name,
        missing=len(var.values) - len(all_vals),
        missing_by_group=missing_by_group,
    )]


def _clean_continuous(values: list) -> list[float]:
    return [float(v) for v in values if v is not None]


def _fmt_continuous(values: list[float], display: str) -> str:
    n = len(values)
    if n == 0:
        return "—"
    if display == "mean_sd":
        mean = statistics.fmean(values)
        sd = statistics.stdev(values) if n >= 2 else 0.0
        return f"{mean:.1f} ± {sd:.1f}"
    else:
        sv = sorted(values)
        median = _percentile(sv, 50)
        q1 = _percentile(sv, 25)
        q3 = _percentile(sv, 75)
        return f"{median:.1f} ({q1:.1f}–{q3:.1f})"


def _continuous_pvalue(
    groups: list[list[float]],
) -> tuple[str | None, str | None]:
    if not _scipy_available():
        return None, None
    valid = [g for g in groups if len(g) >= 2]
    if len(valid) < 2:
        return None, None

    from scipy import stats as sp

    if len(valid) == 2:
        _, p = sp.mannwhitneyu(valid[0], valid[1], alternative="two-sided")
        return _fmt_p(p), "Mann-Whitney U"
    else:
        _, p = sp.kruskal(*valid)
        return _fmt_p(p), "Kruskal-Wallis"


# ── カテゴリ変数 ─────────────────────────────────────────────────────────────

def _categorical_rows(
    var: CategoricalVariable,
    group_map: dict[str, list[int]] | None,
    group_names: list[str] | None,
) -> list[Table1Row]:
    all_vals = _clean_categorical(var.values)
    n_all = len(all_vals)
    categories = _ordered_categories(all_vals)

    p_value: str | None = None
    test_name: str | None = None
    group_counts_per_cat: dict[str, dict[str, int]] | None = None
    missing_by_group: dict[str, int] | None = None

    if group_map is not None and group_names is not None:
        group_vals = {
            g: _clean_categorical([var.values[i] for i in idxs])
            for g, idxs in group_map.items()
        }
        group_counts_per_cat = {
            cat: {g: group_vals[g].count(cat) for g in group_names}
            for cat in categories
        }
        missing_by_group = {
            g: len(group_map[g]) - len(group_vals[g]) for g in group_names
        }
        p_value, test_name = _categorical_pvalue(categories, group_names, group_counts_per_cat)

    # ヘッダー行（変数名 + 全体N）
    rows: list[Table1Row] = [Table1Row(
        variable=var.name,
        overall=f"n = {n_all}",
        groups={g: f"n = {len(group_vals[g])}" for g in group_names} if group_map and group_names else None,
        p_value=p_value,
        test_name=test_name,
        missing=len(var.values) - n_all,
        missing_by_group=missing_by_group,
    )]

    # カテゴリごとのサブ行
    for cat in categories:
        cnt = all_vals.count(cat)
        pct = cnt / n_all * 100 if n_all > 0 else 0.0
        overall_str = f"{cnt} ({pct:.1f}%)"

        grp_strs: dict[str, str] | None = None
        if group_map and group_names and group_counts_per_cat:
            grp_strs = {}
            for g in group_names:
                n_g = sum(group_counts_per_cat[category][g] for category in categories)
                c_g = group_counts_per_cat[cat][g]
                p_g = c_g / n_g * 100 if n_g > 0 else 0.0
                grp_strs[g] = f"{c_g} ({p_g:.1f}%)"

        rows.append(Table1Row(
            variable=cat,
            indent=True,
            overall=overall_str,
            groups=grp_strs,
        ))

    return rows


def _clean_categorical(values: list) -> list[str]:
    return [
        v.strip()
        for v in values
        if v is not None and v.strip().lower() not in _MISSING
    ]


def _ordered_categories(values: list[str]) -> list[str]:
    counts: dict[str, int] = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    return sorted(counts.keys(), key=lambda c: (-counts[c], c))


def _categorical_pvalue(
    categories: list[str],
    group_names: list[str],
    group_counts: dict[str, dict[str, int]],
) -> tuple[str | None, str | None]:
    if not _scipy_available():
        return None, None

    from scipy import stats as sp

    observed = [[group_counts[cat][g] for g in group_names] for cat in categories]
    if len(categories) < 2 or len(group_names) < 2:
        return None, None

    # 期待度数が5未満のセルが20%超ならFisher (2x2のみ)
    try:
        _, _, _, expected = sp.chi2_contingency(observed)
        small_cell_ratio = sum(1 for row in expected for e in row if e < 5) / (
            len(categories) * len(group_names)
        )
        if len(categories) == 2 and len(group_names) == 2 and small_cell_ratio > 0.2:
            _, p = sp.fisher_exact(observed)
            return _fmt_p(p), "Fisher正確検定"
        _, p, _, _ = sp.chi2_contingency(observed, correction=(len(categories) == 2 and len(group_names) == 2))
        return _fmt_p(p), "χ²検定"
    except Exception:
        return None, None


# ── ユーティリティ ────────────────────────────────────────────────────────────

def _percentile(sorted_values: list[float], p: float) -> float:
    n = len(sorted_values)
    if n == 1:
        return sorted_values[0]
    rank = (n - 1) * p / 100
    lo = math.floor(rank)
    hi = math.ceil(rank)
    if lo == hi:
        return sorted_values[lo]
    return sorted_values[lo] * (1 - (rank - lo)) + sorted_values[hi] * (rank - lo)


def _fmt_p(p: float) -> str:
    if p < 0.001:
        return "<0.001"
    return f"{p:.3f}"


def _scipy_available() -> bool:
    return os.getenv("STATSEED_ENABLE_SCIPY") == "1"
