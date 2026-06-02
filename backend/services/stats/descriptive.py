import math

import numpy as np
from scipy import stats

from backend.schemas.descriptive import DescriptiveRequest, DescriptiveResponse


def summarize_continuous(request: DescriptiveRequest) -> DescriptiveResponse:
    cleaned = np.array([value for value in request.values if value is not None], dtype=float)
    n = int(cleaned.size)
    missing = len(request.values) - n

    mean = float(np.mean(cleaned)) if n > 0 else None
    sd = float(np.std(cleaned, ddof=1)) if n >= 2 else None
    median = float(np.median(cleaned))
    q1 = float(np.percentile(cleaned, 25, method="linear"))
    q3 = float(np.percentile(cleaned, 75, method="linear"))
    minimum = float(np.min(cleaned))
    maximum = float(np.max(cleaned))

    ci95_low: float | None = None
    ci95_high: float | None = None
    if n >= 2 and sd is not None:
        sem = sd / math.sqrt(n)
        margin = float(stats.t.ppf(0.975, df=n - 1) * sem)
        ci95_low = mean - margin if mean is not None else None
        ci95_high = mean + margin if mean is not None else None

    shapiro_wilk_p: float | None = None
    if 3 <= n <= 5000:
        shapiro_wilk_p = float(stats.shapiro(cleaned).pvalue)

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
