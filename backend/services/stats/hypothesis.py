import math
import statistics

from backend.schemas.test import (
    ChiSquareRequest,
    CorrelationRequest,
    CorrelationResult,
    MultiGroupRequest,
    PairedRequest,
    TestResult,
    TwoGroupRequest,
)


def _require_finite_result(**values: float) -> None:
    if any(not math.isfinite(value) for value in values.values()):
        raise ValueError("データのばらつきがないため、この検定は計算できません")


def _has_variance(values: list[float]) -> bool:
    return any(value != values[0] for value in values[1:])


# --- 独立2群 t検定 ---

def run_ttest_ind(request: TwoGroupRequest) -> TestResult:
    from scipy import stats

    if not _has_variance(request.group_a) and not _has_variance(request.group_b):
        raise ValueError("データのばらつきがないため、この検定は計算できません")

    t, p = stats.ttest_ind(request.group_a, request.group_b, equal_var=False)
    t = float(t)
    p = float(p)
    _require_finite_result(statistic=t, p_value=p)

    na, nb = len(request.group_a), len(request.group_b)
    mean_a = statistics.fmean(request.group_a)
    mean_b = statistics.fmean(request.group_b)
    sd_a = statistics.stdev(request.group_a)
    sd_b = statistics.stdev(request.group_b)

    pooled_sd = math.sqrt(((na - 1) * sd_a**2 + (nb - 1) * sd_b**2) / (na + nb - 2))
    cohen_d = (mean_a - mean_b) / pooled_sd if pooled_sd > 0 else None

    diff = mean_a - mean_b
    se = math.sqrt(sd_a**2 / na + sd_b**2 / nb)
    df_w = (sd_a**2 / na + sd_b**2 / nb) ** 2 / (
        (sd_a**2 / na) ** 2 / (na - 1) + (sd_b**2 / nb) ** 2 / (nb - 1)
    )
    t_crit = float(stats.t.ppf(0.975, df_w))
    ci_low = diff - t_crit * se
    ci_high = diff + t_crit * se

    interpretation = _interpret_ttest(
        request.variable_name,
        request.group_a_name,
        request.group_b_name,
        mean_a,
        sd_a,
        mean_b,
        sd_b,
        p,
        cohen_d,
    )

    return TestResult(
        test_name="Welchのt検定（独立2群）",
        statistic=t,
        p_value=p,
        effect_size=cohen_d,
        effect_size_label="Cohen's d",
        ci95_low=ci_low,
        ci95_high=ci_high,
        interpretation=interpretation,
    )


def _interpret_ttest(
    var: str,
    a_name: str,
    b_name: str,
    mean_a: float,
    sd_a: float,
    mean_b: float,
    sd_b: float,
    p: float,
    d: float | None,
) -> str:
    sig = "有意差が認められました" if p < 0.05 else "有意差は認められませんでした"
    d_text = ""
    if d is not None:
        size = _cohen_d_label(abs(d))
        d_text = f"効果量Cohen's d={d:.3f}（{size}）。"
    return (
        f"{var}において、{a_name}（平均{mean_a:.2f}±SD{sd_a:.2f}）と"
        f"{b_name}（平均{mean_b:.2f}±SD{sd_b:.2f}）の間に{sig}（p={p:.3f}）。{d_text}"
    ).strip()


def _cohen_d_label(d: float) -> str:
    if d < 0.2:
        return "効果なし"
    if d < 0.5:
        return "小さい効果"
    if d < 0.8:
        return "中程度の効果"
    return "大きい効果"


# --- Mann-Whitney U検定 ---

def run_mannwhitney(request: TwoGroupRequest) -> TestResult:
    from scipy import stats

    u, p = stats.mannwhitneyu(request.group_a, request.group_b, alternative="two-sided")
    u = float(u)
    p = float(p)

    na, nb = len(request.group_a), len(request.group_b)
    r = 1 - 2 * u / (na * nb)

    median_a = statistics.median(request.group_a)
    median_b = statistics.median(request.group_b)

    sig = "有意差が認められました" if p < 0.05 else "有意差は認められませんでした"
    r_label = _r_label(abs(r))
    interpretation = (
        f"{request.variable_name}において、{request.group_a_name}（中央値{median_a:.2f}）と"
        f"{request.group_b_name}（中央値{median_b:.2f}）の間に{sig}（U={u:.1f}, p={p:.3f}）。"
        f"効果量r={r:.3f}（{r_label}）。"
    )

    return TestResult(
        test_name="Mann-Whitney U検定",
        statistic=u,
        p_value=p,
        effect_size=r,
        effect_size_label="r",
        interpretation=interpretation,
    )


def _r_label(r: float) -> str:
    if r < 0.1:
        return "効果なし"
    if r < 0.3:
        return "小さい効果"
    if r < 0.5:
        return "中程度の効果"
    return "大きい効果"


# --- 対応t検定 ---

def run_ttest_paired(request: PairedRequest) -> TestResult:
    from scipy import stats

    diffs = [b - a for b, a in zip(request.before, request.after)]
    if not _has_variance(diffs):
        raise ValueError("データのばらつきがないため、この検定は計算できません")

    t, p = stats.ttest_rel(request.before, request.after)
    t = float(t)
    p = float(p)
    _require_finite_result(statistic=t, p_value=p)

    mean_diff = statistics.fmean(diffs)
    sd_diff = statistics.stdev(diffs) if len(diffs) >= 2 else 0.0
    n = len(diffs)
    se = sd_diff / math.sqrt(n) if n > 0 else 0.0
    t_crit = float(stats.t.ppf(0.975, n - 1)) if n > 1 else 0.0
    ci_low = mean_diff - t_crit * se
    ci_high = mean_diff + t_crit * se
    cohen_d = mean_diff / sd_diff if sd_diff > 0 else None

    sig = "有意差が認められました" if p < 0.05 else "有意差は認められませんでした"
    d_text = f"効果量Cohen's d={cohen_d:.3f}（{_cohen_d_label(abs(cohen_d))}）。" if cohen_d is not None else ""
    interpretation = (
        f"{request.variable_name}において、介入前後に{sig}（t={t:.3f}, p={p:.3f}）。"
        f"平均差={mean_diff:.3f}（95%CI: {ci_low:.3f}–{ci_high:.3f}）。{d_text}"
    ).strip()

    return TestResult(
        test_name="対応のあるt検定",
        statistic=t,
        p_value=p,
        effect_size=cohen_d,
        effect_size_label="Cohen's d",
        ci95_low=ci_low,
        ci95_high=ci_high,
        interpretation=interpretation,
    )


# --- Wilcoxon符号順位検定 ---

def run_wilcoxon(request: PairedRequest) -> TestResult:
    from scipy import stats

    if all(before == after for before, after in zip(request.before, request.after)):
        raise ValueError("すべてのペアの差が0のため、Wilcoxon符号順位検定は計算できません")

    w, p = stats.wilcoxon(request.before, request.after)
    w = float(w)
    p = float(p)
    _require_finite_result(statistic=w, p_value=p)

    n = len(request.before)
    r = 1 - 2 * w / (n * (n + 1) / 2)

    sig = "有意差が認められました" if p < 0.05 else "有意差は認められませんでした"
    r_label = _r_label(abs(r))
    interpretation = (
        f"{request.variable_name}において、介入前後に{sig}（W={w:.1f}, p={p:.3f}）。"
        f"効果量r={r:.3f}（{r_label}）。"
    )

    return TestResult(
        test_name="Wilcoxon符号順位検定",
        statistic=w,
        p_value=p,
        effect_size=r,
        effect_size_label="r",
        interpretation=interpretation,
    )


# --- 一元配置ANOVA ---

def run_anova(request: MultiGroupRequest) -> TestResult:
    from scipy import stats

    all_vals = [v for g in request.groups for v in g]
    if not _has_variance(all_vals):
        raise ValueError("データのばらつきがないため、この検定は計算できません")

    f, p = stats.f_oneway(*request.groups)
    f = float(f)
    p = float(p)
    _require_finite_result(statistic=f, p_value=p)

    n_total = len(all_vals)
    k = len(request.groups)
    grand_mean = statistics.fmean(all_vals)
    ss_between = sum(
        len(g) * (statistics.fmean(g) - grand_mean) ** 2 for g in request.groups
    )
    ss_total = sum((v - grand_mean) ** 2 for v in all_vals)
    eta2 = ss_between / ss_total if ss_total > 0 else None

    names = request.group_names or [f"群{i+1}" for i in range(k)]
    group_summary = "、".join(
        f"{name}（平均{statistics.fmean(g):.2f}）" for name, g in zip(names, request.groups)
    )
    sig = "有意差が認められました" if p < 0.05 else "有意差は認められませんでした"
    eta_text = f"効果量η²={eta2:.3f}。" if eta2 is not None else ""
    interpretation = (
        f"{request.variable_name}の一元配置ANOVAにおいて、{group_summary}の間に{sig}"
        f"（F={f:.3f}, p={p:.3f}）。{eta_text}"
    ).strip()

    return TestResult(
        test_name="一元配置分散分析（ANOVA）",
        statistic=f,
        p_value=p,
        effect_size=eta2,
        effect_size_label="η²",
        interpretation=interpretation,
    )


# --- Kruskal-Wallis検定 ---

def run_kruskal(request: MultiGroupRequest) -> TestResult:
    from scipy import stats

    all_vals = [v for group in request.groups for v in group]
    if not _has_variance(all_vals):
        raise ValueError("データのばらつきがないため、この検定は計算できません")

    h, p = stats.kruskal(*request.groups)
    h = float(h)
    p = float(p)
    _require_finite_result(statistic=h, p_value=p)

    n_total = sum(len(g) for g in request.groups)
    k = len(request.groups)
    eta2_h = (h - k + 1) / (n_total - k) if n_total > k else None

    names = request.group_names or [f"群{i+1}" for i in range(k)]
    group_summary = "、".join(
        f"{name}（中央値{statistics.median(g):.2f}）" for name, g in zip(names, request.groups)
    )
    sig = "有意差が認められました" if p < 0.05 else "有意差は認められませんでした"
    eta_text = f"効果量η²H={eta2_h:.3f}。" if eta2_h is not None else ""
    interpretation = (
        f"{request.variable_name}のKruskal-Wallis検定において、{group_summary}の間に{sig}"
        f"（H={h:.3f}, p={p:.3f}）。{eta_text}"
    ).strip()

    return TestResult(
        test_name="Kruskal-Wallis検定",
        statistic=h,
        p_value=p,
        effect_size=eta2_h,
        effect_size_label="η²H",
        interpretation=interpretation,
    )


# --- χ²検定 ---

def run_chisquare(request: ChiSquareRequest) -> TestResult:
    from scipy import stats
    import numpy as np

    table = np.array(request.observed)
    chi2, p, dof, expected = stats.chi2_contingency(table)
    chi2 = float(chi2)
    p = float(p)
    _require_finite_result(statistic=chi2, p_value=p)

    n = int(table.sum())
    min_dim = min(table.shape) - 1
    cramers_v = math.sqrt(chi2 / (n * min_dim)) if n > 0 and min_dim > 0 else None

    min_expected = float(expected.min())
    warning = ""
    if min_expected < 5:
        warning = f"期待度数が5未満のセルがあります（最小期待度数={min_expected:.2f}）。Fisher正確検定の使用を検討してください。"

    sig = "有意な関連が認められました" if p < 0.05 else "有意な関連は認められませんでした"
    v_text = f"Cramér's V={cramers_v:.3f}。" if cramers_v is not None else ""
    interpretation = (
        f"χ²検定において、{sig}（χ²={chi2:.3f}, df={dof}, p={p:.3f}）。{v_text}{warning}"
    ).strip()

    return TestResult(
        test_name="χ²検定",
        statistic=chi2,
        p_value=p,
        effect_size=cramers_v,
        effect_size_label="Cramér's V",
        interpretation=interpretation,
    )


# --- Fisher正確検定 ---

def run_fisher(request: ChiSquareRequest) -> TestResult:
    from scipy import stats
    import numpy as np

    table = np.array(request.observed)
    if table.shape != (2, 2):
        raise ValueError("Fisher正確検定は2×2の分割表のみ対応しています")

    odds_ratio, p = stats.fisher_exact(table)
    odds_ratio = float(odds_ratio)
    p = float(p)

    sig = "有意な関連が認められました" if p < 0.05 else "有意な関連は認められませんでした"
    finite_odds_ratio = odds_ratio if math.isfinite(odds_ratio) else None
    odds_ratio_text = f"{odds_ratio:.3f}" if finite_odds_ratio is not None else "算出不能（ゼロセルあり）"
    interpretation = (
        f"Fisher正確検定において、{sig}（p={p:.3f}）。オッズ比={odds_ratio_text}。"
    )

    return TestResult(
        test_name="Fisher正確検定",
        statistic=finite_odds_ratio,
        p_value=p,
        effect_size=finite_odds_ratio,
        effect_size_label="オッズ比",
        interpretation=interpretation,
    )


# --- 相関 ---

def run_correlation(request: CorrelationRequest) -> CorrelationResult:
    from scipy import stats

    n = len(request.x)
    if not _has_variance(request.x) or not _has_variance(request.y):
        raise ValueError("データのばらつきがないため、この検定は計算できません")

    if request.method == "pearson":
        r, p = stats.pearsonr(request.x, request.y)
        method_label = "Pearson積率相関係数"
        ci_low, ci_high = _pearson_ci(float(r), n)
    else:
        r, p = stats.spearmanr(request.x, request.y)
        method_label = "Spearman順位相関係数"
        ci_low, ci_high = None, None

    r = float(r)
    p = float(p)
    _require_finite_result(correlation=r, p_value=p)

    direction = "正の相関" if r > 0 else "負の相関"
    strength = _r_strength(abs(r))
    sig = "有意な相関が認められました" if p < 0.05 else "有意な相関は認められませんでした"
    ci_text = f"95%CI: {ci_low:.3f}–{ci_high:.3f}。" if ci_low is not None else ""
    interpretation = (
        f"{request.variable_x_name}と{request.variable_y_name}の間に{strength}の{direction}があり、"
        f"{sig}（{method_label}={r:.3f}, p={p:.3f}）。{ci_text}"
    ).strip()

    return CorrelationResult(
        method=method_label,
        r=r,
        p_value=p,
        n=n,
        ci95_low=ci_low,
        ci95_high=ci_high,
        interpretation=interpretation,
    )


def _pearson_ci(r: float, n: int) -> tuple[float, float]:
    if n < 4 or abs(r) >= 1:
        return (r, r)
    z = math.atanh(r)
    se = 1 / math.sqrt(n - 3)
    z_low = z - 1.96 * se
    z_high = z + 1.96 * se
    return (math.tanh(z_low), math.tanh(z_high))


def _r_strength(r: float) -> str:
    if r < 0.2:
        return "ほぼなし"
    if r < 0.4:
        return "弱い"
    if r < 0.6:
        return "中程度"
    if r < 0.8:
        return "強い"
    return "非常に強い"
