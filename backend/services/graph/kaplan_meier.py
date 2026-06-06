"""Kaplan-Meier survival estimation and log-rank test."""

import math
from dataclasses import dataclass, field


@dataclass
class KMCurve:
    name: str
    step_times: list[float]
    step_surv: list[float]
    ci_lower: list[float]
    ci_upper: list[float]
    censor_times: list[float]
    censor_surv: list[float]
    n_total: int
    n_events: int
    risk_times: list[float]
    risk_counts: list[int]


def km_fit(
    times: list[float],
    events: list[int],
    name: str = "全体",
) -> KMCurve:
    pairs = sorted(zip([float(t) for t in times], events))
    n = len(pairs)

    step_times = [0.0]
    step_surv = [1.0]
    ci_lower = [1.0]
    ci_upper = [1.0]
    greenwood = 0.0

    i = 0
    while i < n:
        t = pairs[i][0]
        j = i
        d = 0
        while j < n and pairs[j][0] == t:
            if pairs[j][1] == 1:
                d += 1
            j += 1
        n_risk = n - i

        if d > 0:
            s_new = step_surv[-1] * (1 - d / n_risk)
            denom = n_risk * (n_risk - d)
            if denom > 0:
                greenwood += d / denom

            step_times.append(t)
            step_surv.append(s_new)

            if s_new > 0 and greenwood >= 0:
                log_s = math.log(s_new)
                half_width = 1.96 * math.sqrt(greenwood)
                ci_lower.append(max(0.0, math.exp(log_s - half_width)))
                ci_upper.append(min(1.0, math.exp(log_s + half_width)))
            else:
                ci_lower.append(0.0)
                ci_upper.append(0.0)

        i = j

    # Censor marks
    censor_times: list[float] = []
    censor_surv: list[float] = []
    for t, e in pairs:
        if e == 0:
            censor_times.append(t)
            censor_surv.append(_surv_at(step_times, step_surv, t))

    # Risk table: 5 evenly spaced time points from 0 to max
    max_t = pairs[-1][0] if pairs else 1.0
    risk_times = [round(max_t * k / 4, 4) for k in range(5)]
    risk_counts = [sum(1 for t, _ in pairs if t >= rt) for rt in risk_times]

    return KMCurve(
        name=name,
        step_times=step_times,
        step_surv=step_surv,
        ci_lower=ci_lower,
        ci_upper=ci_upper,
        censor_times=censor_times,
        censor_surv=censor_surv,
        n_total=n,
        n_events=sum(e for _, e in pairs),
        risk_times=risk_times,
        risk_counts=risk_counts,
    )


def logrank_p(groups: list[tuple[list[float], list[int]]]) -> float | None:
    """Log-rank test p-value for 2+ groups. Returns None if scipy unavailable."""
    try:
        from scipy.stats import chi2 as chi2_dist
    except ImportError:
        return None

    if len(groups) < 2:
        return None

    event_times = sorted({
        t for times, events in groups
        for t, e in zip(times, events) if e == 1
    })
    if not event_times:
        return None

    k = len(groups)
    O_E = [0.0] * k
    V = [0.0] * k

    for t in event_times:
        n_g = [sum(1 for ti, ei in zip(times, events) if ti >= t) for times, events in groups]
        d_g = [sum(1 for ti, ei in zip(times, events) if ti == t and ei == 1) for times, events in groups]
        n_total = sum(n_g)
        d_total = sum(d_g)

        if n_total == 0 or d_total == 0:
            continue

        for g in range(k):
            O_E[g] += d_g[g] - n_g[g] * d_total / n_total
            if n_total > 1:
                V[g] += (
                    d_total * n_g[g] * (n_total - n_g[g]) * (n_total - d_total)
                ) / (n_total ** 2 * (n_total - 1))

    chi2_stat = sum(oe ** 2 / v for oe, v in zip(O_E[:-1], V[:-1]) if v > 0)
    return float(1 - chi2_dist.cdf(chi2_stat, df=k - 1))


def _surv_at(step_times: list[float], step_surv: list[float], t: float) -> float:
    s = 1.0
    for st, ss in zip(step_times, step_surv):
        if st <= t:
            s = ss
        else:
            break
    return s


def parse_groups(
    times: list[float],
    events: list[int],
    group_labels: list[str | None] | None,
) -> list[KMCurve]:
    if not group_labels:
        return [km_fit(times, events)]

    groups: dict[str, tuple[list[float], list[int]]] = {}
    for t, e, g in zip(times, events, group_labels):
        key = g if g is not None else "不明"
        if key not in groups:
            groups[key] = ([], [])
        groups[key][0].append(t)
        groups[key][1].append(e)

    return [km_fit(gt, ge, name=gn) for gn, (gt, ge) in sorted(groups.items())]
