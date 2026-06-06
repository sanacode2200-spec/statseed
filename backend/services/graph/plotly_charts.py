import math
import statistics

from backend.schemas.graph import BarplotRequest, BoxplotRequest, HistogramRequest, KaplanMeierRequest, PlotlyFigure, ScatterRequest

OKABE_ITO = ["#0072B2", "#E69F00", "#009E73", "#CC79A7"]

_LAYOUT_BASE: dict = {
    "font": {"family": "Arial, Helvetica, sans-serif", "size": 11, "color": "#373737"},
    "paper_bgcolor": "white",
    "plot_bgcolor": "white",
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


def km_figure(request: KaplanMeierRequest) -> PlotlyFigure:
    from backend.services.graph.kaplan_meier import logrank_p, parse_groups

    times = [float(t) for t in request.times]
    curves = parse_groups(times, request.events, request.group_labels)
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
        group_pairs = []
        for curve in curves:
            idx = [i for i, (t, e) in enumerate(zip(times, request.events)) if (request.group_labels or [None] * len(times))[i] == curve.name.split(" ")[0]]
            # Rebuild from parse_groups result
            pass
        # Re-compute p-value
        p = None
        if request.group_labels:
            from backend.services.graph.kaplan_meier import parse_groups as _pg
            from collections import defaultdict
            grps: dict[str, tuple[list, list]] = defaultdict(lambda: ([], []))
            for t, e, g in zip(times, request.events, request.group_labels):
                key = g if g is not None else "不明"
                grps[key][0].append(t)
                grps[key][1].append(e)
            p = logrank_p(list(grps.values()))

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
    if request.show_risk_table and curves:
        curve0 = curves[0]
        risk_texts = [f"N at risk: {c}" for c in curve0.risk_counts]
        risk_labels = [f"{t:.0f}" for t in curve0.risk_times]
        for i, (rt, rn) in enumerate(zip(curve0.risk_times, curve0.risk_counts)):
            annotations.append({
                "text": str(rn),
                "xref": "x", "yref": "paper",
                "x": rt, "y": -0.10,
                "xanchor": "center", "yanchor": "top",
                "showarrow": False,
                "font": {"size": 10, "color": "#555"},
            })
        annotations.append({
            "text": "N at risk",
            "xref": "paper", "yref": "paper",
            "x": -0.02, "y": -0.10,
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
        margin={"l": 60, "r": 30, "t": 50, "b": 80},
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

    k = len(request.groups)
    names = request.group_names or [f"群{i + 1}" for i in range(k)]
    colors = [OKABE_ITO[i % len(OKABE_ITO)] for i in range(k)]

    traces = []
    for i, (group, name, color) in enumerate(zip(request.groups, names, colors)):
        traces.append({
            "type": "box",
            "y": group,
            "name": name,
            "marker": {"color": color, "opacity": 0.8},
            "line": {"color": color, "width": 1.5},
            "boxpoints": False,
            "width": 0.4,
        })

        if request.show_jitter:
            rng = random.Random(i)
            jitter = [rng.uniform(-0.12, 0.12) for _ in group]
            traces.append({
                "type": "scatter",
                "x": [i + j for j in jitter],
                "y": group,
                "mode": "markers",
                "name": name,
                "showlegend": False,
                "marker": {
                    "color": color,
                    "size": 5,
                    "opacity": 0.5,
                    "line": {"color": "white", "width": 0.5},
                },
            })

    layout = _layout(
        title={"text": request.title, "font": {"size": 13}} if request.title else {},
        yaxis=dict(_LAYOUT_BASE["yaxis"], title=request.y_label),
        xaxis=dict(
            _LAYOUT_BASE["xaxis"],
            tickmode="array",
            tickvals=list(range(k)),
            ticktext=names,
        ),
        showlegend=False,
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
