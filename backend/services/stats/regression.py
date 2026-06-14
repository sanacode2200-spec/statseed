import math

from backend.schemas.regression import (
    Coefficient,
    LinearRegressionRequest,
    LinearRegressionResult,
)

_INTERCEPT_LABEL = "（切片）"


def run_linear_regression(request: LinearRegressionRequest) -> LinearRegressionResult:
    """最小二乗法（OLS）による線形回帰。単回帰・重回帰（共変量調整）に対応。

    計算は statsmodels.OLS を直接利用し、自前実装は行わない。
    欠損は行単位（リストワイズ）で除外する。
    """
    import numpy as np
    import statsmodels.api as sm

    n_total = len(request.outcome)
    k = len(request.predictors)

    # リストワイズ除外: 目的変数・全説明変数が揃っている行のみ使用
    y_list: list[float] = []
    x_rows: list[list[float]] = []
    for i in range(n_total):
        y_i = request.outcome[i]
        x_i = [p.values[i] for p in request.predictors]
        if y_i is None or any(v is None for v in x_i):
            continue
        y_list.append(float(y_i))
        x_rows.append([float(v) for v in x_i])

    n_used = len(y_list)
    n_excluded = n_total - n_used

    # 係数(切片含む k+1)を推定するには最低でも k+2 件の有効データが必要
    if n_used < k + 2:
        raise ValueError(
            f"有効データ数({n_used}件)が説明変数の数({k}個)に対して不足しています。"
            f"少なくとも{k + 2}件必要です。"
        )

    y = np.asarray(y_list, dtype=float)
    x = np.asarray(x_rows, dtype=float)

    for j, p in enumerate(request.predictors):
        if float(np.ptp(x[:, j])) == 0.0:
            raise ValueError(f"説明変数「{p.name}」の値がすべて同じため回帰できません")

    design = sm.add_constant(x, has_constant="add")
    model = sm.OLS(y, design).fit()

    if not (math.isfinite(model.rsquared) and math.isfinite(model.fvalue)):
        raise ValueError(
            "回帰係数が計算できませんでした。"
            "説明変数間に強い相関（多重共線性）がないか確認してください。"
        )

    names = [_INTERCEPT_LABEL] + [p.name for p in request.predictors]
    conf = model.conf_int(0.05)
    y_sd = float(y.std(ddof=1))

    coefficients: list[Coefficient] = []
    for idx, name in enumerate(names):
        std_coef: float | None = None
        if idx > 0 and y_sd > 0:
            x_sd = float(x[:, idx - 1].std(ddof=1))
            std_coef = float(model.params[idx]) * x_sd / y_sd
        coefficients.append(
            Coefficient(
                name=name,
                coef=float(model.params[idx]),
                std_err=float(model.bse[idx]),
                t_value=float(model.tvalues[idx]),
                p_value=float(model.pvalues[idx]),
                ci95_low=float(conf[idx][0]),
                ci95_high=float(conf[idx][1]),
                std_coef=std_coef,
            )
        )

    interpretation = _interpret(request, model, coefficients, n_used, n_excluded, k)

    return LinearRegressionResult(
        outcome_name=request.outcome_name,
        coefficients=coefficients,
        n_total=n_total,
        n_used=n_used,
        n_excluded=n_excluded,
        df_model=int(model.df_model),
        df_resid=int(model.df_resid),
        r_squared=float(model.rsquared),
        adj_r_squared=float(model.rsquared_adj),
        f_statistic=float(model.fvalue),
        f_pvalue=float(model.f_pvalue),
        interpretation=interpretation,
    )


def _interpret(
    request: LinearRegressionRequest,
    model,
    coefficients: list[Coefficient],
    n_used: int,
    n_excluded: int,
    k: int,
) -> str:
    r2 = float(model.rsquared)
    adj = float(model.rsquared_adj)
    fp = float(model.f_pvalue)

    lines: list[str] = []
    if k == 1:
        lines.append(
            f"{request.outcome_name}を「{request.predictors[0].name}」で予測する"
            f"単回帰モデルです。"
        )
    else:
        lines.append(
            f"{request.outcome_name}を{k}個の説明変数で予測する重回帰モデルです。"
            f"各偏回帰係数は、他の変数を一定としたときの独立した影響を表します。"
        )

    lines.append(
        f"決定係数 R² = {r2:.3f}（自由度調整済み R² = {adj:.3f}）で、"
        f"{request.outcome_name}のばらつきの約 {r2 * 100:.1f}% を説明しています。"
    )

    model_sig = "統計的に有意です" if fp < 0.05 else "統計的に有意ではありません"
    lines.append(f"モデル全体のF検定は p = {_fmt_p(fp)} で、{model_sig}。")

    sig = [c for c in coefficients if c.name != _INTERCEPT_LABEL and c.p_value < 0.05]
    if sig:
        parts = []
        for c in sig:
            direction = "増える" if c.coef > 0 else "減る"
            parts.append(
                f"「{c.name}」が1増えると{request.outcome_name}は平均 "
                f"{abs(c.coef):.3g} {direction}（p = {_fmt_p(c.p_value)}）"
            )
        lines.append("有意な説明変数: " + "、".join(parts) + "。")
    else:
        lines.append("個々の説明変数で統計的に有意なものはありませんでした。")

    if n_excluded > 0:
        lines.append(
            f"欠損のため {n_excluded} 件を除外し、{n_used} 件で解析しました。"
        )

    return " ".join(lines)


def _fmt_p(p: float) -> str:
    if p < 0.001:
        return "<0.001"
    return f"{p:.3f}"
