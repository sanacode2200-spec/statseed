import math
import statistics

from backend.schemas.graph import BoxplotRequest, HistogramRequest, PlotlyFigure, ScatterRequest

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
