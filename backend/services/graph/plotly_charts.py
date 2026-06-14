import math
import statistics

from backend.schemas.graph import BarplotRequest, BoxplotRequest, HistogramRequest, KaplanMeierRequest, PlotlyFigure, ROCRequest, ROCResponse, ScatterRequest

OKABE_ITO = ["#0072B2", "#E69F00", "#009E73", "#CC79A7"]

_LAYOUT_BASE: dict = {
    "font": {"family": "Arial, Helvetica, sans-serif", "size": 11, "color": "#373737"},
    "paper_bgcolor": "rgba(0,0,0,0)",
    "plot_bgcolor": "rgba(0,0,0,0)",
    "margin": {"l": 60, "r": 30, "t": 50, "b": 60},
    "xaxis": {
        "linecolor": "#373737",
        "linewidth": 0.8,
        "showgrid": False,
        "ticks": "outside",
        "ticklen": 4,
        "mirror": False,
    },
    "yaxis": {
        "linecolor": "#373737",
        "linewidth": 0.8,
        "showgrid": False,
        "ticks": "outside",
        "ticklen": 4,
        "mirror": False,
    },
    "legend": {"bgcolor": "rgba(0,0,0,0)", "borderwidth": 0},
}


def _layout(**overrides: object) -> dict:
    import copy
    layout = copy.deepcopy(_LAYOUT_BASE)
    layout.update(overrides)
    return layout


def roc_figure(request: ROCRequest) -> tuple[PlotlyFigure, ROCResponse]:
    from backend.services.graph.roc import compute_roc

    scores = [float(s) for s in request.scores]
    result = compute_roc(scores, request.labels)

    # Interpretation
    sens = round(result.optimal_tpr * 100, 1)
    spec = round((1 - result.optimal_fpr) * 100, 1)
    auc_str = f"{result.auc:.3f}"
    ci_str = f"{result.auc_ci_lower:.3f}–{result.auc_ci_upper:.3f}"
    interp = (
        f"AUC = {auc_str}（95%CI: {ci_str}）。"
        f"最適カットオフ値 = {result.optimal_threshold:.3f}（感度 {sens}%、特異度 {spec}%）。"
        f"陽性例 {result.n_pos}件・陰性例 {result.n_neg}件。"
    )

    traces = [
        # Diagonal (AUC=0.5)
        {
            "type": "scatter",
            "x": [0, 1], "y": [0, 1],
            "mode": "lines",
            "name": "AUC = 0.5",
            "line": {"color": "#aaa", "width": 1, "dash": "dot"},
            "showlegend": False,
        },
        # ROC curve
        {
            "type": "scatter",
            "x": result.fpr, "y": result.tpr,
            "mode": "lines",
            "name": f"ROC (AUC = {result.auc:.3f})",
            "line": {"color": OKABE_ITO[0], "width": 2},
            "fill": "tozeroy",
            "fillcolor": _hex_to_rgba(OKABE_ITO[0], 0.08),
        },
        # Optimal point
        {
            "type": "scatter",
            "x": [result.optimal_fpr], "y": [result.optimal_tpr],
            "mode": "markers",
            "name": f"最適カットオフ ({result.optimal_threshold:.3f})",
            "marker": {"color": OKABE_ITO[1], "size": 10, "line": {"color": "white", "width": 1.5}},
        },
    ]

    annotations = [
        {
            "text": f"AUC = {result.auc:.3f}<br>95%CI: {result.auc_ci_lower:.3f}–{result.auc_ci_upper:.3f}",
            "xref": "paper", "yref": "paper",
            "x": 0.98, "y": 0.05,
            "xanchor": "right", "yanchor": "bottom",
            "showarrow": False,
            "font": {"size": 11},
            "bgcolor": "rgba(255,255,255,0.85)",
            "bordercolor": "#ddd", "borderwidth": 1,
        }
    ]

    layout = _layout(
        title={"text": request.title, "font": {"size": 13}} if request.title else {},
        xaxis=dict(_LAYOUT_BASE["xaxis"], title="1 - 特異度（偽陽性率）", range=[-0.02, 1.02]),
        yaxis=dict(_LAYOUT_BASE["yaxis"], title="感度（真陽性率）", range=[-0.02, 1.05]),
        showlegend=True,
        annotations=annotations,
    )

    response = ROCResponse(
        fpr=result.fpr,
        tpr=result.tpr,
        thresholds=result.thresholds,
        auc=result.auc,
        auc_ci_lower=result.auc_ci_lower,
        auc_ci_upper=result.auc_ci_upper,
        optimal_threshold=result.optimal_threshold,
        optimal_fpr=result.optimal_fpr,
        optimal_tpr=result.optimal_tpr,
        n_pos=result.n_pos,
        n_neg=result.n_neg,
        interpretation=interp,
    )

    return PlotlyFigure(data=traces, layout=layout), response


def km_figure(request: KaplanMeierRequest) -> PlotlyFigure:
    from backend.services.graph.kaplan_meier import logrank_p, parse_groups, split_groups

    times = [float(t) for t in request.times]
    curves = parse_groups(times, request.events, request.group_labels)
    group_data = split_groups(times, request.events, request.group_labels)
    colors = [OKABE_ITO[i % len(OKABE_ITO)] for i in range(len(curves))]
    multi = len(curves) > 1

    traces: list[dict] = []

    for curve, color in zip(curves, colors):
        # CI band (upper then lower with fill)
        if request.show_ci and len(curve.step_times) > 1:
            traces.append({
                "type": "scatter",
                "x": curve.step_times,
                "y": curve.ci_upper,
                "mode": "lines",
                "line": {"color": "rgba(0,0,0,0)", "shape": "hv"},
                "showlegend": False,
                "hoverinfo": "skip",
            })
            traces.append({
                "type": "scatter",
                "x": curve.step_times,
                "y": curve.ci_lower,
                "mode": "lines",
                "fill": "tonexty",
                "fillcolor": _hex_to_rgba(color, 0.12),
                "line": {"color": "rgba(0,0,0,0)", "shape": "hv"},
                "showlegend": False,
                "hoverinfo": "skip",
            })

        # KM step line
        traces.append({
            "type": "scatter",
            "x": curve.step_times,
            "y": curve.step_surv,
            "mode": "lines",
            "name": f"{curve.name} (n={curve.n_total}, イベント={curve.n_events})" if multi else curve.name,
            "line": {"color": color, "width": 2, "shape": "hv"},
        })

        # Censor marks
        if curve.censor_times:
            traces.append({
                "type": "scatter",
                "x": curve.censor_times,
                "y": curve.censor_surv,
                "mode": "markers",
                "name": "打ち切り",
                "showlegend": False,
                "marker": {"color": color, "size": 8, "symbol": "line-ns", "line": {"width": 2, "color": color}},
                "hovertemplate": "打ち切り: t=%{x}<extra></extra>",
            })

    # Log-rank p-value annotation
    annotations = []
    if multi:
        p = logrank_p([(group_times, group_events) for _, group_times, group_events in group_data])

        if p is not None:
            p_text = f"ログランク検定: p{'<0.001' if p < 0.001 else f'={p:.3f}'}"
            annotations.append({
                "text": p_text,
                "xref": "paper", "yref": "paper",
                "x": 0.98, "y": 0.98,
                "xanchor": "right", "yanchor": "top",
                "showarrow": False,
                "font": {"size": 11, "color": "#373737"},
                "bgcolor": "rgba(255,255,255,0.8)",
                "bordercolor": "#ddd",
                "borderwidth": 1,
            })

    # Risk table annotation
    if request.show_risk_table and group_data:
        max_time = max(times)
        risk_times = [max_time * i / 4 for i in range(5)]
        for row, (name, group_times, _) in enumerate(group_data):
            y = -0.10 - row * 0.07
            for risk_time in risk_times:
                n_at_risk = sum(time >= risk_time for time in group_times)
                annotations.append({
                    "text": str(n_at_risk),
                    "xref": "x", "yref": "paper",
                    "x": risk_time, "y": y,
                    "xanchor": "center", "yanchor": "top",
                    "showarrow": False,
                    "font": {"size": 10, "color": "#555"},
                })
            annotations.append({
                "text": name if multi else "N at risk",
                "xref": "paper", "yref": "paper",
                "x": -0.02, "y": y,
                "xanchor": "right", "yanchor": "top",
                "showarrow": False,
                "font": {"size": 10, "color": "#555"},
            })

    layout = _layout(
        title={"text": request.title, "font": {"size": 13}} if request.title else {},
        xaxis=dict(_LAYOUT_BASE["xaxis"], title=request.time_label, rangemode="tozero"),
        yaxis=dict(_LAYOUT_BASE["yaxis"], title=request.survival_label, range=[0, 1.05]),
        showlegend=multi,
        annotations=annotations,
        margin={"l": 60, "r": 30, "t": 50, "b": 80 + max(0, len(group_data) - 1) * 20},
    )

    return PlotlyFigure(data=traces, layout=layout)


def _hex_to_rgba(hex_color: str, alpha: float) -> str:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return f"rgba({r},{g},{b},{alpha})"


def barplot_figure(request: BarplotRequest) -> PlotlyFigure:
    k = len(request.groups)
    names = request.group_names or [f"群{i + 1}" for i in range(k)]
    colors = [OKABE_ITO[i % len(OKABE_ITO)] for i in range(k)]

    traces = []
    for i, (group, name, color) in enumerate(zip(request.groups, names, colors)):
        mean = statistics.fmean(group)
        err = _error_bar_value(group, request.error_type)
        traces.append({
            "type": "bar",
            "x": [name],
            "y": [mean],
            "name": name,
            "marker": {"color": color, "opacity": 0.85, "line": {"color": color, "width": 1}},
            "error_y": {
                "type": "data",
                "array": [err],
                "visible": True,
                "color": "#373737",
                "thickness": 1.5,
                "width": 6,
            },
            "showlegend": False,
        })

    error_label = {"sd": "SD", "sem": "SEM", "ci95": "95%CI"}[request.error_type]
    layout = _layout(
        title={"text": request.title, "font": {"size": 13}} if request.title else {},
        yaxis=dict(_LAYOUT_BASE["yaxis"], title=request.y_label),
        xaxis=dict(_LAYOUT_BASE["xaxis"], title=""),
        bargap=0.4,
        annotations=[{
            "text": f"エラーバー: {error_label}",
            "xref": "paper", "yref": "paper",
            "x": 1.0, "y": -0.12,
            "xanchor": "right", "yanchor": "top",
            "showarrow": False,
            "font": {"size": 9, "color": "#888"},
        }],
    )
    return PlotlyFigure(data=traces, layout=layout)


def _error_bar_value(values: list[float], error_type: str) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    sd = statistics.stdev(values)
    if error_type == "sd":
        return sd
    sem = sd / math.sqrt(n)
    if error_type == "sem":
        return sem
    # ci95: t * SEM
    t_crit = {1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
              6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
              20: 2.086, 30: 2.042}.get(n - 1) or (2.042 if n <= 30 else 1.96)
    return t_crit * sem


def boxplot_figure(request: BoxplotRequest) -> PlotlyFigure:
    import random

    from backend.services.graph.boxplot_comparison import (
        annotated_pairs,
        compute_boxplot_comparison,
        p_value_text,
    )
    from backend.services.graph.boxplot_style import display_names, effective_display_style

    k = len(request.groups)
    raw_names = request.group_names or [f"群{i + 1}" for i in range(k)]
    names = display_names(request)
    tick_names = [name.replace("\n", "<br>") for name in names]
    style = effective_display_style(request)
    accent_colors = (
        [OKABE_ITO[i % len(OKABE_ITO)] for i in range(k)]
        if request.color_mode == "color"
        else ["#6B7280"] * k
    )

    traces = []
    for i, (group, name, color) in enumerate(zip(request.groups, names, accent_colors)):
        if style == "distribution":
            traces.append({
                "type": "violin",
                "x": [i] * len(group),
                "y": group,
                "name": name,
                "width": 0.72,
                "fillcolor": _hex_to_rgba(color, 0.14),
                "line": {"color": _hex_to_rgba(color, 0.7), "width": 0.8},
                "box": {"visible": False},
                "meanline": {"visible": False},
                "points": False,
                "spanmode": "hard",
                "hoverinfo": "skip",
                "showlegend": False,
            })

        if style == "individual":
            rng = random.Random(i)
            jitter = [rng.uniform(-0.18, 0.18) for _ in group]
            point_size = 6 if len(group) <= 40 else 5 if len(group) <= 100 else 4
            point_opacity = 0.58 if len(group) <= 40 else 0.42 if len(group) <= 100 else 0.28
            traces.append({
                "type": "scatter",
                "x": [i + j for j in jitter],
                "y": group,
                "mode": "markers",
                "name": name,
                "showlegend": False,
                "marker": {
                    "color": color,
                    "size": point_size,
                    "opacity": point_opacity,
                    "line": {"width": 0},
                },
                "hovertemplate": "%{y}<extra></extra>",
            })

        traces.append({
            "type": "box",
            "x": [i] * len(group),
            "y": group,
            "name": name,
            "fillcolor": "rgba(115,115,115,0.12)",
            "marker": {"color": "#737373", "size": 5, "opacity": 0.65},
            "line": {"color": "#373737", "width": 1.4},
            "boxpoints": "outliers" if style != "individual" else False,
            "width": 0.30 if style == "distribution" else 0.42,
            "whiskerwidth": 0.65,
            "showlegend": False,
        })

    comparison = compute_boxplot_comparison(request)
    pairs = sorted(
        annotated_pairs(comparison),
        key=lambda pair: abs(raw_names.index(pair.group_b) - raw_names.index(pair.group_a)),
    )
    shapes = []
    annotations = []
    all_values = [value for group in request.groups for value in group]
    data_min, data_max = min(all_values), max(all_values)
    data_span = data_max - data_min or 1.0
    annotation_step = data_span * 0.075
    annotation_base = data_max + data_span * 0.06
    for level, pair in enumerate(pairs):
        left = raw_names.index(pair.group_a)
        right = raw_names.index(pair.group_b)
        y = annotation_base + level * annotation_step
        cap = data_span * 0.025
        shapes.extend([
            {"type": "line", "x0": left, "x1": left, "y0": y - cap, "y1": y, "line": {"color": "#525252", "width": 1}},
            {"type": "line", "x0": left, "x1": right, "y0": y, "y1": y, "line": {"color": "#525252", "width": 1}},
            {"type": "line", "x0": right, "x1": right, "y0": y - cap, "y1": y, "line": {"color": "#525252", "width": 1}},
        ])
        annotations.append({
            "text": p_value_text(pair.p_value),
            "x": (left + right) / 2,
            "y": y + cap,
            "showarrow": False,
            "font": {"size": 10, "color": "#525252"},
            "yanchor": "bottom",
        })

    yaxis = dict(
        _LAYOUT_BASE["yaxis"],
        title=request.y_label,
        showgrid=request.show_grid,
        gridcolor="rgba(128,128,128,0.16)",
        gridwidth=0.7,
        zeroline=False,
    )
    annotation_top = annotation_base + len(pairs) * annotation_step + data_span * 0.05
    if request.y_min is not None or request.y_max is not None:
        yaxis["range"] = [
            request.y_min,
            max(request.y_max, annotation_top) if request.y_max is not None and pairs else request.y_max,
        ]
    elif pairs:
        yaxis["range"] = [data_min - data_span * 0.08, annotation_top]

    layout = _layout(
        title={"text": request.title, "font": {"size": 13}} if request.title else {},
        yaxis=yaxis,
        xaxis=dict(
            _LAYOUT_BASE["xaxis"],
            tickmode="array",
            tickvals=list(range(k)),
            ticktext=tick_names,
            zeroline=False,
        ),
        showlegend=False,
        violinmode="overlay",
        boxmode="overlay",
        shapes=shapes,
        annotations=annotations,
    )

    return PlotlyFigure(data=traces, layout=layout)


def histogram_figure(request: HistogramRequest) -> PlotlyFigure:
    traces = []
    n = len(request.values)
    bins = request.bins or max(5, min(50, int(math.sqrt(n))))

    traces.append({
        "type": "histogram",
        "x": request.values,
        "nbinsx": bins,
        "marker": {"color": OKABE_ITO[0], "opacity": 0.75, "line": {"color": "white", "width": 0.5}},
        "name": "度数",
    })

    if request.show_normal_curve and n >= 4:
        mean = statistics.fmean(request.values)
        sd = statistics.stdev(request.values)
        if sd > 0:
            min_v = min(request.values)
            max_v = max(request.values)
            span = max_v - min_v or 1.0
            x_curve = [min_v - 0.1 * span + span * 1.2 * i / 100 for i in range(101)]
            bin_width = span * 1.2 / bins
            y_curve = [
                n * bin_width * math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * math.sqrt(2 * math.pi))
                for x in x_curve
            ]
            traces.append({
                "type": "scatter",
                "x": x_curve,
                "y": y_curve,
                "mode": "lines",
                "name": "正規分布曲線",
                "line": {"color": OKABE_ITO[1], "width": 2, "dash": "dot"},
            })

    layout = _layout(
        title={"text": request.title, "font": {"size": 13}} if request.title else {},
        xaxis=dict(_LAYOUT_BASE["xaxis"], title=request.x_label),
        yaxis=dict(_LAYOUT_BASE["yaxis"], title="度数"),
        showlegend=bool(request.show_normal_curve and n >= 4),
        bargap=0.05,
    )

    return PlotlyFigure(data=traces, layout=layout)


def scatter_figure(request: ScatterRequest) -> PlotlyFigure:
    traces = []

    traces.append({
        "type": "scatter",
        "x": request.x,
        "y": request.y,
        "mode": "markers",
        "name": "データ",
        "marker": {"color": OKABE_ITO[0], "size": 7, "opacity": 0.75, "line": {"color": "white", "width": 0.5}},
    })

    if request.show_regression and len(request.x) >= 3:
        n = len(request.x)
        mean_x = statistics.fmean(request.x)
        mean_y = statistics.fmean(request.y)
        ss_xx = sum((xi - mean_x) ** 2 for xi in request.x)
        ss_xy = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(request.x, request.y))
        if ss_xx > 0:
            slope = ss_xy / ss_xx
            intercept = mean_y - slope * mean_x
            x_min, x_max = min(request.x), max(request.x)
            pad = (x_max - x_min) * 0.05 or 0.5
            x_line = [x_min - pad, x_max + pad]
            y_line = [slope * x + intercept for x in x_line]
            traces.append({
                "type": "scatter",
                "x": x_line,
                "y": y_line,
                "mode": "lines",
                "name": "回帰直線",
                "line": {"color": OKABE_ITO[1], "width": 2},
            })

    layout = _layout(
        title={"text": request.title, "font": {"size": 13}} if request.title else {},
        xaxis=dict(_LAYOUT_BASE["xaxis"], title=request.x_label),
        yaxis=dict(_LAYOUT_BASE["yaxis"], title=request.y_label),
        showlegend=request.show_regression,
    )

    return PlotlyFigure(data=traces, layout=layout)
