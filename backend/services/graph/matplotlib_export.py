import io
import math
import random
import statistics

from backend.schemas.graph import BarplotRequest, BoxplotRequest, ExportRequest, HistogramRequest, KaplanMeierRequest, ROCRequest, ScatterRequest
from backend.services.graph.theme import FONT_FALLBACK_CHAIN, FONT_PRESETS, OKABE_ITO, STATSEED_THEME

_COLORS = list(OKABE_ITO.values())[:4]


def _apply_theme(request: ExportRequest | None = None) -> None:
    import matplotlib as mpl
    mpl.rcParams.update(STATSEED_THEME)

    if request is None:
        return

    preset = request.font_preset
    if preset == "カスタム":
        if request.font_family:
            mpl.rcParams["font.family"] = [request.font_family, *FONT_FALLBACK_CHAIN]
        if request.font_size:
            mpl.rcParams["font.size"] = request.font_size
            mpl.rcParams["axes.labelsize"] = request.font_size
            mpl.rcParams["axes.titlesize"] = request.font_size + 1
    elif preset and preset in FONT_PRESETS and FONT_PRESETS[preset]:
        p = FONT_PRESETS[preset]
        mpl.rcParams["font.family"] = [p["family"], *FONT_FALLBACK_CHAIN]
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
    elif request.chart_type == "roc" and request.roc:
        fig = _roc_fig(request.roc, plt)
    else:
        fig = _scatter_fig(request.scatter, plt)  # type: ignore[arg-type]

    buf = io.BytesIO()
    fig.savefig(buf, format=fmt, bbox_inches="tight", transparent=request.transparent)
    plt.close(fig)
    buf.seek(0)
    return buf.read(), mime


def _boxplot_fig(req: BoxplotRequest, plt):  # type: ignore[no-untyped-def]
    from matplotlib.colors import to_rgba

    from backend.services.graph.boxplot_comparison import (
        annotated_pairs,
        compute_boxplot_comparison,
        p_value_text,
    )
    from backend.services.graph.boxplot_style import display_names, effective_display_style

    k = len(req.groups)
    raw_names = req.group_names or [f"群{i + 1}" for i in range(k)]
    names = display_names(req)
    style = effective_display_style(req)
    accent_colors = (
        [_COLORS[i % len(_COLORS)] for i in range(k)]
        if req.color_mode == "color"
        else ["#6B7280"] * k
    )

    fig, ax = plt.subplots(figsize=(max(3.5, k * 1.4), 4))

    if style == "distribution":
        violin = ax.violinplot(
            req.groups,
            positions=list(range(1, k + 1)),
            widths=0.72,
            showmeans=False,
            showmedians=False,
            showextrema=False,
        )
        for body, color in zip(violin["bodies"], accent_colors):
            body.set_facecolor(color)
            body.set_edgecolor(color)
            body.set_linewidth(0.8)
            body.set_alpha(0.16)

    bp = ax.boxplot(
        req.groups,
        labels=names,
        patch_artist=True,
        widths=0.30 if style == "distribution" else 0.42,
        medianprops={"color": "#373737", "linewidth": 2},
        whiskerprops={"color": "#373737", "linewidth": 0.9},
        capprops={"color": "#373737", "linewidth": 0.9},
        flierprops={
            "marker": "o",
            "markersize": 3,
            "markerfacecolor": "#737373",
            "markeredgewidth": 0,
            "alpha": 0.6,
        },
        showfliers=style != "individual",
    )
    for patch in bp["boxes"]:
        patch.set_facecolor(to_rgba("#737373", 0.12))
        patch.set_edgecolor("#373737")
        patch.set_linewidth(1.1)

    if style == "individual":
        rng = random.Random(0)
        for i, (group, color) in enumerate(zip(req.groups, accent_colors)):
            jitter = [rng.uniform(-0.18, 0.18) for _ in group]
            point_size = 18 if len(group) <= 40 else 14 if len(group) <= 100 else 10
            point_alpha = 0.58 if len(group) <= 40 else 0.42 if len(group) <= 100 else 0.28
            ax.scatter(
                [i + 1 + j for j in jitter],
                group,
                color=color,
                s=point_size,
                alpha=point_alpha,
                zorder=1,
                linewidths=0,
            )

    ax.set_ylabel(req.y_label or "")
    if req.title:
        ax.set_title(req.title)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.set_axisbelow(True)
    ax.yaxis.grid(req.show_grid, color="#D4D4D4", linewidth=0.6, alpha=0.65)
    pairs = sorted(
        annotated_pairs(compute_boxplot_comparison(req)),
        key=lambda pair: abs(raw_names.index(pair.group_b) - raw_names.index(pair.group_a)),
    )
    annotation_top = None
    if pairs:
        all_values = [value for group in req.groups for value in group]
        data_min, data_max = min(all_values), max(all_values)
        data_span = data_max - data_min or 1.0
        annotation_step = data_span * 0.075
        annotation_base = data_max + data_span * 0.06
        cap = data_span * 0.025
        for level, pair in enumerate(pairs):
            left = raw_names.index(pair.group_a) + 1
            right = raw_names.index(pair.group_b) + 1
            y = annotation_base + level * annotation_step
            ax.plot([left, left, right, right], [y - cap, y, y, y - cap], color="#525252", linewidth=0.8)
            ax.text((left + right) / 2, y + cap, p_value_text(pair.p_value), ha="center", va="bottom", fontsize=8, color="#525252")
        annotation_top = annotation_base + len(pairs) * annotation_step + data_span * 0.05

    if req.y_min is not None or req.y_max is not None:
        top = max(req.y_max, annotation_top) if req.y_max is not None and annotation_top is not None else req.y_max
        ax.set_ylim(bottom=req.y_min, top=top)
    elif annotation_top is not None:
        ax.set_ylim(data_min - data_span * 0.08, annotation_top)
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
            2, 1, figsize=(5, 5.5),
            gridspec_kw={"height_ratios": [4, 1], "hspace": 0.05},
        )
    else:
        fig, ax = plt.subplots(figsize=(5, 4.5))
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


def _roc_fig(req: ROCRequest, plt):  # type: ignore[no-untyped-def]
    import numpy as np
    from backend.services.graph.roc import compute_roc

    scores = [float(s) for s in req.scores]
    result = compute_roc(scores, req.labels)

    fig, ax = plt.subplots(figsize=(4.5, 4.5))

    ax.plot([0, 1], [0, 1], color="#aaa", linewidth=1, linestyle=":")
    ax.plot(result.fpr, result.tpr, color=_COLORS[0], linewidth=1.5)
    ax.fill_between(result.fpr, result.tpr, 0, color=_COLORS[0], alpha=0.08)
    ax.scatter(
        [result.optimal_fpr], [result.optimal_tpr],
        color=_COLORS[1], s=40, zorder=3,
        linewidths=1, edgecolors="white",
    )

    ax.text(
        0.98, 0.04,
        f"AUC = {result.auc:.3f}\n95%CI: {result.auc_ci_lower:.3f}–{result.auc_ci_upper:.3f}",
        transform=ax.transAxes, ha="right", va="bottom", fontsize=8,
        bbox={"boxstyle": "round,pad=0.3", "facecolor": "white", "edgecolor": "#ddd", "alpha": 0.8},
    )

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1.02)
    ax.set_xticks(np.arange(0, 1.01, 0.2))
    ax.set_yticks(np.arange(0, 1.01, 0.2))
    ax.set_xlabel("1 - 特異度（偽陽性率）")
    ax.set_ylabel("感度（真陽性率）")
    if req.title:
        ax.set_title(req.title)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    return fig
