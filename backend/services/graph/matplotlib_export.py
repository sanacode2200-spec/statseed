import io
import math
import random
import statistics

from backend.schemas.graph import BarplotRequest, BoxplotRequest, ExportRequest, HistogramRequest, KaplanMeierRequest, ScatterRequest
from backend.services.graph.theme import OKABE_ITO, STATSEED_THEME

_COLORS = list(OKABE_ITO.values())[:4]


def _apply_theme(request: ExportRequest | None = None) -> None:
    import matplotlib as mpl
    mpl.rcParams.update(STATSEED_THEME)

    if request is None:
        return

    preset = request.font_preset
    if preset == "カスタム":
        if request.font_family:
            mpl.rcParams["font.sans-serif"] = [request.font_family, "DejaVu Sans"]
        if request.font_size:
            mpl.rcParams["font.size"] = request.font_size
            mpl.rcParams["axes.labelsize"] = request.font_size
            mpl.rcParams["axes.titlesize"] = request.font_size + 1
    elif preset and preset in FONT_PRESETS and FONT_PRESETS[preset]:
        p = FONT_PRESETS[preset]
        mpl.rcParams["font.sans-serif"] = [p["family"], "DejaVu Sans"]
        mpl.rcParams["font.size"] = p["size"]
        mpl.rcParams["axes.labelsize"] = p["size"]
        mpl.rcParams["axes.titlesize"] = p["size"] + 1


def export_bytes(request: ExportRequest) -> tuple[bytes, str]:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    _apply_theme(request)

    fmt = request.format
    mime = {"png": "image/png", "svg": "image/svg+xml", "pdf": "application/pdf"}[fmt]

    if request.chart_type == "boxplot" and request.boxplot:
        fig = _boxplot_fig(request.boxplot, plt)
    elif request.chart_type == "histogram" and request.histogram:
        fig = _histogram_fig(request.histogram, plt)
    elif request.chart_type == "barplot" and request.barplot:
        fig = _barplot_fig(request.barplot, plt)
    elif request.chart_type == "kaplan_meier" and request.kaplan_meier:
        fig = _km_fig(request.kaplan_meier, plt)
    else:
        fig = _scatter_fig(request.scatter, plt)  # type: ignore[arg-type]

    buf = io.BytesIO()
    fig.savefig(buf, format=fmt, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.read(), mime


def _boxplot_fig(req: BoxplotRequest, plt):  # type: ignore[no-untyped-def]
    import numpy as np

    k = len(req.groups)
    names = req.group_names or [f"群{i + 1}" for i in range(k)]
    colors = [_COLORS[i % len(_COLORS)] for i in range(k)]

    fig, ax = plt.subplots(figsize=(max(3.5, k * 1.4), 4))

    bp = ax.boxplot(
        req.groups,
        labels=names,
        patch_artist=True,
        widths=0.35,
        medianprops={"color": "#373737", "linewidth": 1.5},
        whiskerprops={"linewidth": 0.8},
        capprops={"linewidth": 0.8},
        flierprops={"marker": ""},
    )
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.75)
        patch.set_linewidth(0.8)

    if req.show_jitter:
        rng = random.Random(0)
        for i, (group, color) in enumerate(zip(req.groups, colors)):
            jitter = [rng.uniform(-0.12, 0.12) for _ in group]
            ax.scatter(
                [i + 1 + j for j in jitter],
                group,
                color=color,
                s=18,
                alpha=0.55,
                zorder=3,
                linewidths=0.3,
                edgecolors="white",
            )

    ax.set_ylabel(req.y_label or "")
    if req.title:
        ax.set_title(req.title)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    return fig


def _histogram_fig(req: HistogramRequest, plt):  # type: ignore[no-untyped-def]
    import numpy as np

    n = len(req.values)
    bins = req.bins or max(5, min(50, int(math.sqrt(n))))

    fig, ax = plt.subplots(figsize=(5, 4))
    counts, edges, _ = ax.hist(
        req.values,
        bins=bins,
        color=_COLORS[0],
        alpha=0.75,
        edgecolor="white",
        linewidth=0.5,
    )

    if req.show_normal_curve and n >= 4:
        mean = statistics.fmean(req.values)
        sd = statistics.stdev(req.values)
        if sd > 0:
            bin_width = edges[1] - edges[0]
            x_min = edges[0] - bin_width
            x_max = edges[-1] + bin_width
            xs = np.linspace(x_min, x_max, 200)
            ys = (
                n
                * bin_width
                * np.exp(-0.5 * ((xs - mean) / sd) ** 2)
                / (sd * math.sqrt(2 * math.pi))
            )
            ax.plot(xs, ys, color=_COLORS[1], linewidth=1.5, linestyle="--", label="正規分布曲線")
            ax.legend()

    ax.set_xlabel(req.x_label or "")
    ax.set_ylabel("度数")
    if req.title:
        ax.set_title(req.title)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    return fig


def _barplot_fig(req: BarplotRequest, plt):  # type: ignore[no-untyped-def]
    k = len(req.groups)
    names = req.group_names or [f"群{i + 1}" for i in range(k)]
    colors = [_COLORS[i % len(_COLORS)] for i in range(k)]

    means = [statistics.fmean(g) for g in req.groups]
    errors = [_error_value(g, req.error_type) for g in req.groups]

    fig, ax = plt.subplots(figsize=(max(3.5, k * 1.2), 4))
    x_pos = list(range(k))
    bars = ax.bar(x_pos, means, color=colors, width=0.5, alpha=0.85, linewidth=0.8, edgecolor=colors)
    ax.errorbar(
        x_pos, means, yerr=errors,
        fmt="none", color="#373737", linewidth=1.2, capsize=4, capthick=1.2,
    )

    ax.set_xticks(x_pos)
    ax.set_xticklabels(names)
    ax.set_ylabel(req.y_label or "")
    if req.title:
        ax.set_title(req.title)

    error_label = {"sd": "SD", "sem": "SEM", "ci95": "95%CI"}[req.error_type]
    ax.set_xlabel(f"エラーバー: {error_label}", fontsize=7, color="#888")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    return fig


def _error_value(values: list[float], error_type: str) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    sd = statistics.stdev(values)
    if error_type == "sd":
        return sd
    sem = sd / math.sqrt(n)
    if error_type == "sem":
        return sem
    t_crit = {1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
              6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
              20: 2.086, 30: 2.042}.get(n - 1) or (2.042 if n <= 30 else 1.96)
    return t_crit * sem


def _km_fig(req: KaplanMeierRequest, plt):  # type: ignore[no-untyped-def]
    from backend.services.graph.kaplan_meier import logrank_p, parse_groups
    from collections import defaultdict

    times = [float(t) for t in req.times]
    curves = parse_groups(times, req.events, req.group_labels)
    colors = [_COLORS[i % len(_COLORS)] for i in range(len(curves))]
    multi = len(curves) > 1

    if req.show_risk_table:
        fig, (ax, ax_risk) = plt.subplots(
            2, 1, figsize=(6, 5),
            gridspec_kw={"height_ratios": [4, 1], "hspace": 0.05},
        )
    else:
        fig, ax = plt.subplots(figsize=(6, 4))
        ax_risk = None

    for curve, color in zip(curves, colors):
        label = f"{curve.name} (n={curve.n_total})" if multi else curve.name
        # Step function
        ax.step(curve.step_times, curve.step_surv, where="post", color=color, linewidth=1.5, label=label)
        # CI band
        if req.show_ci and len(curve.step_times) > 1:
            import numpy as np
            # Expand step for fill
            t_arr = np.repeat(curve.step_times, 2)[1:]
            l_arr = np.repeat(curve.ci_lower, 2)[:-1]
            u_arr = np.repeat(curve.ci_upper, 2)[:-1]
            ax.fill_between(t_arr, l_arr, u_arr, alpha=0.12, color=color, step=None)
        # Censor marks
        if curve.censor_times:
            ax.plot(curve.censor_times, curve.censor_surv, "+", color=color, markersize=7, markeredgewidth=1.2)

    # Log-rank p
    if multi and req.group_labels:
        grps: dict[str, tuple[list, list]] = defaultdict(lambda: ([], []))
        for t, e, g in zip(times, req.events, req.group_labels):
            key = g if g is not None else "不明"
            grps[key][0].append(t)
            grps[key][1].append(e)
        p = logrank_p(list(grps.values()))
        if p is not None:
            p_str = "<0.001" if p < 0.001 else f"={p:.3f}"
            ax.text(0.98, 0.98, f"ログランク p{p_str}", transform=ax.transAxes,
                    ha="right", va="top", fontsize=8, color="#373737",
                    bbox={"boxstyle": "round,pad=0.3", "facecolor": "white", "edgecolor": "#ccc", "alpha": 0.8})

    ax.set_xlim(left=0)
    ax.set_ylim(0, 1.05)
    ax.set_ylabel(req.survival_label or "生存率")
    ax.set_xlabel(req.time_label or "時間")
    if req.title:
        ax.set_title(req.title)
    if multi:
        ax.legend(fontsize=7, frameon=False)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

    # Risk table
    if ax_risk is not None and curves:
        curve0 = curves[0]
        ax_risk.set_xlim(ax.get_xlim())
        ax_risk.set_yticks([])
        ax_risk.spines[:].set_visible(False)
        for rt, rc in zip(curve0.risk_times, curve0.risk_counts):
            ax_risk.text(rt, 0.5, str(rc), ha="center", va="center", fontsize=8, color="#555")
        ax_risk.text(-0.01 * (ax.get_xlim()[1]), 0.5, "N at risk",
                     ha="right", va="center", fontsize=8, color="#555")
        ax_risk.set_xlabel(req.time_label or "時間")
        ax.set_xlabel("")

    return fig


def _scatter_fig(req: ScatterRequest, plt):  # type: ignore[no-untyped-def]
    import numpy as np

    fig, ax = plt.subplots(figsize=(4.5, 4))
    ax.scatter(
        req.x,
        req.y,
        color=_COLORS[0],
        s=25,
        alpha=0.75,
        linewidths=0.3,
        edgecolors="white",
        zorder=3,
    )

    if req.show_regression and len(req.x) >= 3:
        mean_x = statistics.fmean(req.x)
        mean_y = statistics.fmean(req.y)
        ss_xx = sum((xi - mean_x) ** 2 for xi in req.x)
        ss_xy = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(req.x, req.y))
        if ss_xx > 0:
            slope = ss_xy / ss_xx
            intercept = mean_y - slope * mean_x
            x_min, x_max = min(req.x), max(req.x)
            pad = (x_max - x_min) * 0.05 or 0.5
            xs = np.array([x_min - pad, x_max + pad])
            ax.plot(xs, slope * xs + intercept, color=_COLORS[1], linewidth=1.5, label="回帰直線")
            ax.legend()

    ax.set_xlabel(req.x_label or "")
    ax.set_ylabel(req.y_label or "")
    if req.title:
        ax.set_title(req.title)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    return fig
