import math

from backend.schemas.regression import (
    Coefficient,
    LinearRegressionRequest,
    LinearRegressionResult,
    LogisticRegressionRequest,
    LogisticRegressionResult,
    MixedCoefficient,
    MixedModelRequest,
    MixedModelResult,
    OddsRatio,
    PoissonRegressionRequest,
    PoissonRegressionResult,
    RateRatio,
)

_INTERCEPT_LABEL = "（切片）"


def _listwise_rows(outcome, predictors):
    """目的変数・全説明変数が揃っている行のみを (y_list, x_rows) として返す。"""
    y_list: list[float] = []
    x_rows: list[list[float]] = []
    for i in range(len(outcome)):
        y_i = outcome[i]
        x_i = [p.values[i] for p in predictors]
        if y_i is None or any(v is None for v in x_i):
            continue
        y_list.append(float(y_i))
        x_rows.append([float(v) for v in x_i])
    return y_list, x_rows


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


# ── ロジスティック回帰 ────────────────────────────────────────────────────────

def run_logistic_regression(
    request: LogisticRegressionRequest,
) -> LogisticRegressionResult:
    """2値アウトカム（1=イベント）に対するロジスティック回帰。

    計算は statsmodels.Logit を直接利用し、各説明変数のオッズ比(OR)と95%CIを返す。
    欠損は行単位（リストワイズ）で除外する。
    """
    import numpy as np
    import statsmodels.api as sm

    n_total = len(request.outcome)
    k = len(request.predictors)

    y_list, x_rows = _listwise_rows(request.outcome, request.predictors)
    n_used = len(y_list)
    n_excluded = n_total - n_used

    # アウトカムは 0/1 の2値
    distinct = set(y_list)
    if not distinct.issubset({0.0, 1.0}):
        raise ValueError(
            "アウトカムは 0 / 1 の2値で入力してください（1=イベント発生, 0=非発生）"
        )
    if len(distinct) < 2:
        raise ValueError("アウトカムに 0 と 1 の両方が必要です")

    n_events = int(sum(y_list))

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
    try:
        model = sm.Logit(y, design).fit(disp=False, maxiter=100)
    except Exception:
        raise ValueError(
            "ロジスティック回帰が収束しませんでした。"
            "データの完全分離（あるカテゴリでイベントが全件/0件）や"
            "多重共線性がないか確認してください。"
        )

    params = np.asarray(model.params, dtype=float)
    bse = np.asarray(model.bse, dtype=float)
    if not (np.all(np.isfinite(params)) and np.all(np.isfinite(bse))):
        raise ValueError(
            "推定が不安定です（完全分離の可能性）。"
            "説明変数とアウトカムの関係を確認してください。"
        )
    # 完全分離では係数が発散しオッズ比が非有限になる
    if not all(math.isfinite(math.exp(c)) for c in params):
        raise ValueError(
            "オッズ比が計算できませんでした（完全分離の可能性）。"
        )

    conf = model.conf_int(0.05)  # 対数オッズのCI
    names = [_INTERCEPT_LABEL] + [p.name for p in request.predictors]

    coefficients: list[OddsRatio] = []
    for idx, name in enumerate(names):
        coef = float(params[idx])
        coefficients.append(
            OddsRatio(
                name=name,
                coef=coef,
                odds_ratio=math.exp(coef),
                std_err=float(bse[idx]),
                p_value=float(model.pvalues[idx]),
                or_ci95_low=math.exp(float(conf[idx][0])),
                or_ci95_high=math.exp(float(conf[idx][1])),
            )
        )

    interpretation = _interpret_logistic(
        request, model, coefficients, n_used, n_excluded, n_events
    )

    return LogisticRegressionResult(
        outcome_name=request.outcome_name,
        coefficients=coefficients,
        n_total=n_total,
        n_used=n_used,
        n_excluded=n_excluded,
        n_events=n_events,
        pseudo_r_squared=float(model.prsquared),
        log_likelihood=float(model.llf),
        ll_null=float(model.llnull),
        lr_pvalue=float(model.llr_pvalue),
        interpretation=interpretation,
    )


def _interpret_logistic(
    request: LogisticRegressionRequest,
    model,
    coefficients: list[OddsRatio],
    n_used: int,
    n_excluded: int,
    n_events: int,
) -> str:
    lines: list[str] = []
    k = len(request.predictors)
    if k == 1:
        lines.append(
            f"{request.outcome_name}（1=発生）を「{request.predictors[0].name}」で"
            f"予測するロジスティック回帰モデルです。"
            f"オッズ比(OR)は説明変数が1増えるごとのオッズの倍率を表します。"
        )
    else:
        lines.append(
            f"{request.outcome_name}（1=発生）を{k}個の説明変数で予測する"
            f"ロジスティック回帰モデルです。各オッズ比(OR)は他の変数を一定としたときの"
            f"独立した影響を表します。"
        )

    lr_p = float(model.llr_pvalue)
    model_sig = "統計的に有意です" if lr_p < 0.05 else "統計的に有意ではありません"
    lines.append(
        f"McFadden 擬似R² = {float(model.prsquared):.3f}。"
        f"モデル全体の尤度比検定は p = {_fmt_p(lr_p)} で、{model_sig}。"
    )

    sig = [c for c in coefficients if c.name != _INTERCEPT_LABEL and c.p_value < 0.05]
    if sig:
        parts = []
        for c in sig:
            direction = "高く" if c.odds_ratio > 1 else "低く"
            parts.append(
                f"「{c.name}」が1増えるごとに{request.outcome_name}のオッズが "
                f"{c.odds_ratio:.2f}倍（95%CI {c.or_ci95_low:.2f}–{c.or_ci95_high:.2f}, "
                f"p = {_fmt_p(c.p_value)}）= 発生しやすさが{direction}なる"
            )
        lines.append("有意な説明変数: " + "、".join(parts) + "。")
    else:
        lines.append("個々の説明変数で統計的に有意なものはありませんでした。")

    lines.append(f"{n_used}件中 {n_events}件 がイベント発生でした。")
    if n_excluded > 0:
        lines.append(f"欠損のため {n_excluded}件を除外しました。")

    return " ".join(lines)


# ── ポアソン回帰（GLM・カウントデータ） ──────────────────────────────────────

def run_poisson_regression(
    request: PoissonRegressionRequest,
) -> PoissonRegressionResult:
    """カウント（0以上の整数）アウトカムに対するポアソン回帰（GLM・log link）。

    各説明変数の発生率比(IRR = exp(coef))と95%CIを返す。
    欠損は行単位（リストワイズ）で除外する。
    """
    import numpy as np
    import statsmodels.api as sm

    n_total = len(request.outcome)
    k = len(request.predictors)

    y_list, x_rows = _listwise_rows(request.outcome, request.predictors)
    n_used = len(y_list)
    n_excluded = n_total - n_used

    if any(v < 0 for v in y_list):
        raise ValueError("件数（目的変数）に負の値は使えません。0以上のカウントを入力してください")
    if any(abs(v - round(v)) > 1e-9 for v in y_list):
        raise ValueError("件数（目的変数）は整数で入力してください（例: 0, 1, 2 …）")

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
    try:
        model = sm.GLM(y, design, family=sm.families.Poisson()).fit()
        null_model = sm.GLM(
            y, np.ones((n_used, 1)), family=sm.families.Poisson()
        ).fit()
    except Exception:
        raise ValueError(
            "ポアソン回帰が収束しませんでした。データや説明変数を確認してください。"
        )

    params = np.asarray(model.params, dtype=float)
    bse = np.asarray(model.bse, dtype=float)
    if not (np.all(np.isfinite(params)) and np.all(np.isfinite(bse))):
        raise ValueError("推定が不安定です。説明変数間の多重共線性などを確認してください。")
    if not all(math.isfinite(math.exp(c)) for c in params):
        raise ValueError("発生率比が計算できませんでした。")

    conf = model.conf_int(0.05)  # 対数率比のCI
    names = [_INTERCEPT_LABEL] + [p.name for p in request.predictors]

    coefficients: list[RateRatio] = []
    for idx, name in enumerate(names):
        coef = float(params[idx])
        coefficients.append(
            RateRatio(
                name=name,
                coef=coef,
                rate_ratio=math.exp(coef),
                std_err=float(bse[idx]),
                p_value=float(model.pvalues[idx]),
                rr_ci95_low=math.exp(float(conf[idx][0])),
                rr_ci95_high=math.exp(float(conf[idx][1])),
            )
        )

    llf = float(model.llf)
    llnull = float(null_model.llf)
    pseudo = 1.0 - llf / llnull if llnull != 0 else 0.0
    from scipy import stats as sp

    lr_stat = 2.0 * (llf - llnull)
    lr_p = float(sp.chi2.sf(lr_stat, k)) if k > 0 else 1.0

    interpretation = _interpret_poisson(
        request, coefficients, pseudo, lr_p, n_used, n_excluded
    )

    return PoissonRegressionResult(
        outcome_name=request.outcome_name,
        coefficients=coefficients,
        n_total=n_total,
        n_used=n_used,
        n_excluded=n_excluded,
        pseudo_r_squared=pseudo,
        log_likelihood=llf,
        ll_null=llnull,
        lr_pvalue=lr_p,
        deviance=float(model.deviance),
        interpretation=interpretation,
    )


def _interpret_poisson(
    request: PoissonRegressionRequest,
    coefficients: list[RateRatio],
    pseudo: float,
    lr_p: float,
    n_used: int,
    n_excluded: int,
) -> str:
    lines: list[str] = []
    k = len(request.predictors)
    if k == 1:
        lines.append(
            f"{request.outcome_name}（カウント）を「{request.predictors[0].name}」で"
            f"予測するポアソン回帰モデルです。"
            f"発生率比(IRR)は説明変数が1増えるごとの発生率の倍率を表します。"
        )
    else:
        lines.append(
            f"{request.outcome_name}（カウント）を{k}個の説明変数で予測する"
            f"ポアソン回帰モデルです。各発生率比(IRR)は他の変数を一定としたときの"
            f"独立した影響を表します。"
        )

    model_sig = "統計的に有意です" if lr_p < 0.05 else "統計的に有意ではありません"
    lines.append(
        f"McFadden 擬似R² = {pseudo:.3f}。"
        f"モデル全体の尤度比検定は p = {_fmt_p(lr_p)} で、{model_sig}。"
    )

    sig = [c for c in coefficients if c.name != _INTERCEPT_LABEL and c.p_value < 0.05]
    if sig:
        parts = []
        for c in sig:
            direction = "増え" if c.rate_ratio > 1 else "減り"
            parts.append(
                f"「{c.name}」が1増えるごとに{request.outcome_name}の発生率が "
                f"{c.rate_ratio:.2f}倍（95%CI {c.rr_ci95_low:.2f}–{c.rr_ci95_high:.2f}, "
                f"p = {_fmt_p(c.p_value)}）= {direction}やすくなる"
            )
        lines.append("有意な説明変数: " + "、".join(parts) + "。")
    else:
        lines.append("個々の説明変数で統計的に有意なものはありませんでした。")

    if n_excluded > 0:
        lines.append(f"欠損のため {n_excluded}件を除外し、{n_used}件で解析しました。")

    return " ".join(lines)


# ── 混合効果モデル（線形混合モデル・ランダム切片） ─────────────────────────────

def _listwise_rows_with_group(outcome, predictors, group):
    """目的変数・全説明変数・グループが揃っている行のみを返す。"""
    y_list: list[float] = []
    x_rows: list[list[float]] = []
    g_list: list[str] = []
    for i in range(len(outcome)):
        y_i = outcome[i]
        x_i = [p.values[i] for p in predictors]
        g_i = group[i]
        if y_i is None or g_i is None or any(v is None for v in x_i):
            continue
        y_list.append(float(y_i))
        x_rows.append([float(v) for v in x_i])
        g_list.append(str(g_i))
    return y_list, x_rows, g_list


def run_mixed_model(request: MixedModelRequest) -> MixedModelResult:
    """ランダム切片付き線形混合モデル（LMM）。

    患者IDなどのグループ単位の繰り返し測定・クラスタリングを調整したうえで、
    固定効果（説明変数）の影響を推定する。計算は statsmodels.MixedLM を直接利用し、
    自前実装は行わない（REML推定、固定効果はWald z検定）。
    欠損は行単位（リストワイズ）で除外する。
    """
    import numpy as np
    import statsmodels.api as sm

    n_total = len(request.outcome)
    k = len(request.predictors)

    y_list, x_rows, g_list = _listwise_rows_with_group(
        request.outcome, request.predictors, request.group
    )
    n_used = len(y_list)
    n_excluded = n_total - n_used

    group_counts: dict[str, int] = {}
    for g in g_list:
        group_counts[g] = group_counts.get(g, 0) + 1
    n_groups = len(group_counts)

    if n_groups < 3:
        raise ValueError(
            f"グループ「{request.group_name}」の数({n_groups}個)が不足しています。"
            f"ランダム切片を推定するには少なくとも3グループ必要です。"
        )
    if max(group_counts.values()) <= 1:
        raise ValueError(
            f"すべてのグループで観測が1件のみです。ランダム切片を推定するには、"
            f"いずれかのグループに2件以上の観測が必要です。"
        )
    if n_used < k + 3:
        raise ValueError(
            f"有効データ数({n_used}件)が説明変数の数({k}個)に対して不足しています。"
            f"少なくとも{k + 3}件必要です。"
        )

    y = np.asarray(y_list, dtype=float)
    x = np.asarray(x_rows, dtype=float)

    for j, p in enumerate(request.predictors):
        if float(np.ptp(x[:, j])) == 0.0:
            raise ValueError(f"説明変数「{p.name}」の値がすべて同じため回帰できません")

    design = sm.add_constant(x, has_constant="add")
    try:
        model = sm.MixedLM(y, design, groups=g_list)
        fit = model.fit(reml=True)
    except Exception:
        raise ValueError(
            "混合モデルが収束しませんでした。説明変数を減らすか、"
            "グループ・データを確認してください。"
        )

    n_fe = design.shape[1]
    fe_params = np.asarray(fit.fe_params, dtype=float)
    fe_bse = np.asarray(fit.bse_fe, dtype=float)
    if not fit.converged or not (
        np.all(np.isfinite(fe_params)) and np.all(np.isfinite(fe_bse))
    ):
        raise ValueError(
            "混合モデルが収束しませんでした。説明変数を減らすか、"
            "グループ・データを確認してください。"
        )

    conf = fit.conf_int(0.05)
    names = [_INTERCEPT_LABEL] + [p.name for p in request.predictors]

    coefficients: list[MixedCoefficient] = []
    for idx, name in enumerate(names):
        coefficients.append(
            MixedCoefficient(
                name=name,
                coef=float(fe_params[idx]),
                std_err=float(fe_bse[idx]),
                z_value=float(fit.tvalues[idx]),
                p_value=float(fit.pvalues[idx]),
                ci95_low=float(conf[idx][0]),
                ci95_high=float(conf[idx][1]),
            )
        )

    group_var = float(fit.cov_re[0][0])
    resid_var = float(fit.scale)
    icc = group_var / (group_var + resid_var) if (group_var + resid_var) > 0 else 0.0

    interpretation = _interpret_mixed(
        request, coefficients, n_used, n_excluded, n_groups, group_var, resid_var, icc
    )

    return MixedModelResult(
        outcome_name=request.outcome_name,
        group_name=request.group_name,
        coefficients=coefficients,
        n_total=n_total,
        n_used=n_used,
        n_excluded=n_excluded,
        n_groups=n_groups,
        group_var=group_var,
        resid_var=resid_var,
        icc=icc,
        log_likelihood=float(fit.llf),
        converged=bool(fit.converged),
        interpretation=interpretation,
    )


def _interpret_mixed(
    request: MixedModelRequest,
    coefficients: list[MixedCoefficient],
    n_used: int,
    n_excluded: int,
    n_groups: int,
    group_var: float,
    resid_var: float,
    icc: float,
) -> str:
    lines: list[str] = []
    k = len(request.predictors)
    if k == 1:
        lines.append(
            f"{request.outcome_name}を「{request.predictors[0].name}」で予測し、"
            f"「{request.group_name}」単位の繰り返し測定・クラスタリングを"
            f"ランダム切片で調整した混合効果モデルです。"
        )
    else:
        lines.append(
            f"{request.outcome_name}を{k}個の説明変数で予測し、"
            f"「{request.group_name}」単位の繰り返し測定・クラスタリングを"
            f"ランダム切片で調整した混合効果モデルです。"
            f"各固定効果は他の変数を一定としたときの独立した影響を表します。"
        )

    lines.append(
        f"{request.group_name}間のばらつき（群間分散）= {group_var:.3g}、"
        f"残差分散 = {resid_var:.3g}、群内相関係数(ICC) = {icc:.3f}。"
        f"ICCは{request.outcome_name}の全体のばらつきのうち"
        f"{request.group_name}間の違いで説明できる割合を表します。"
    )

    sig = [c for c in coefficients if c.name != _INTERCEPT_LABEL and c.p_value < 0.05]
    if sig:
        parts = []
        for c in sig:
            direction = "増える" if c.coef > 0 else "減る"
            parts.append(
                f"「{c.name}」が1増えると{request.outcome_name}は平均 "
                f"{abs(c.coef):.3g} {direction}（p = {_fmt_p(c.p_value)}）"
            )
        lines.append("有意な固定効果: " + "、".join(parts) + "。")
    else:
        lines.append("個々の固定効果で統計的に有意なものはありませんでした。")

    lines.append(f"{n_groups}個の{request.group_name}、{n_used}件のデータで解析しました。")
    if n_excluded > 0:
        lines.append(f"欠損のため {n_excluded}件を除外しました。")

    return " ".join(lines)
