import math
import os
import statistics

from backend.schemas.descriptive import (
    CategoricalRequest,
    CategoricalResponse,
    CategoryCount,
    DescriptiveRequest,
    DescriptiveResponse,
)

T_CRITICAL_975 = {
    1: 12.706,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    11: 2.201,
    12: 2.179,
    13: 2.160,
    14: 2.145,
    15: 2.131,
    16: 2.120,
    17: 2.110,
    18: 2.101,
    19: 2.093,
    20: 2.086,
    21: 2.080,
    22: 2.074,
    23: 2.069,
    24: 2.064,
    25: 2.060,
    26: 2.056,
    27: 2.052,
    28: 2.048,
    29: 2.045,
    30: 2.042,
}


def summarize_continuous(request: DescriptiveRequest) -> DescriptiveResponse:
    cleaned = sorted(float(value) for value in request.values if value is not None)
    n = len(cleaned)
    missing = len(request.values) - n

    mean = statistics.fmean(cleaned) if n > 0 else None
    sd = statistics.stdev(cleaned) if n >= 2 else None
    median = _percentile_linear(cleaned, 50)
    q1 = _percentile_linear(cleaned, 25)
    q3 = _percentile_linear(cleaned, 75)
    minimum = cleaned[0]
    maximum = cleaned[-1]

    ci95_low: float | None = None
    ci95_high: float | None = None
    if n >= 2 and sd is not None:
        sem = sd / math.sqrt(n)
        margin = _t_critical_975(n - 1) * sem
        ci95_low = mean - margin if mean is not None else None
        ci95_high = mean + margin if mean is not None else None

    shapiro_wilk_p = _optional_shapiro_wilk_p(cleaned)

    interpretation = _build_interpretation(
        variable_name=request.variable_name,
        n=n,
        missing=missing,
        mean=mean,
        sd=sd,
        median=median,
        q1=q1,
        q3=q3,
        shapiro_wilk_p=shapiro_wilk_p,
    )

    return DescriptiveResponse(
        variable_name=request.variable_name,
        n=n,
        missing=missing,
        mean=mean,
        sd=sd,
        median=median,
        q1=q1,
        q3=q3,
        iqr=q3 - q1,
        minimum=minimum,
        maximum=maximum,
        ci95_low=ci95_low,
        ci95_high=ci95_high,
        shapiro_wilk_p=shapiro_wilk_p,
        interpretation=interpretation,
    )


def _percentile_linear(values: list[float], percentile: float) -> float:
    if len(values) == 1:
        return values[0]

    rank = (len(values) - 1) * percentile / 100
    lower = math.floor(rank)
    upper = math.ceil(rank)
    if lower == upper:
        return values[lower]

    weight = rank - lower
    return values[lower] * (1 - weight) + values[upper] * weight


def _t_critical_975(df: int) -> float:
    if df <= 30:
        return T_CRITICAL_975[df]
    if df <= 60:
        return 2.000
    if df <= 120:
        return 1.980
    return 1.960


def _optional_shapiro_wilk_p(values: list[float]) -> float | None:
    if not (3 <= len(values) <= 5000):
        return None
    if os.getenv("STATSEED_ENABLE_SCIPY") != "1":
        return None

    try:
        from scipy import stats
    except ImportError:
        return None

    return float(stats.shapiro(values).pvalue)


def _build_interpretation(
    *,
    variable_name: str,
    n: int,
    missing: int,
    mean: float | None,
    sd: float | None,
    median: float,
    q1: float,
    q3: float,
    shapiro_wilk_p: float | None,
) -> str:
    location = f"{variable_name}は中央値 {median:.2f}（IQR {q1:.2f}-{q3:.2f}）です。"
    if mean is not None and sd is not None:
        location = f"{variable_name}は平均 {mean:.2f}、標準偏差 {sd:.2f}、中央値 {median:.2f}（IQR {q1:.2f}-{q3:.2f}）です。"

    missing_text = f"欠損値は{missing}件あります。" if missing else "欠損値はありません。"

    normality_text = ""
    if shapiro_wilk_p is not None:
        if shapiro_wilk_p < 0.05:
            normality_text = f"Shapiro-Wilk検定ではp={shapiro_wilk_p:.3f}で、正規分布から外れている可能性があります。"
        else:
            normality_text = f"Shapiro-Wilk検定ではp={shapiro_wilk_p:.3f}で、正規分布から大きく外れているとはいえません。"

    return f"{location} 有効データ数は{n}件です。{missing_text} {normality_text}".strip()


def summarize_categorical(request: CategoricalRequest) -> CategoricalResponse:
    _MISSING = {"", "na", "-"}
    cleaned = [
        v.strip()
        for v in request.values
        if v is not None and v.strip().lower() not in _MISSING
    ]
    n = len(cleaned)
    missing = len(request.values) - n

    counts: dict[str, int] = {}
    for v in cleaned:
        counts[v] = counts.get(v, 0) + 1

    categories = sorted(
        [CategoryCount(label=label, count=count, percent=count / n * 100 if n > 0 else 0.0)
         for label, count in counts.items()],
        key=lambda c: (-c.count, c.label),
    )

    most_common = categories[0].label if categories else "—"
    top_percent = f"{categories[0].percent:.1f}" if categories else "0"
    missing_text = f"欠損値は{missing}件あります。" if missing else "欠損値はありません。"
    interpretation = (
        f"{request.variable_name}は{len(categories)}カテゴリ、有効データ数{n}件です。"
        f"{missing_text}"
        f"最頻値は「{most_common}」（{categories[0].count}件、{top_percent}%）です。"
        if categories
        else f"{request.variable_name}の有効データがありません。"
    )

    return CategoricalResponse(
        variable_name=request.variable_name,
        n=n,
        missing=missing,
        categories=categories,
        interpretation=interpretation,
    )
