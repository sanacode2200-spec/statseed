from pydantic import BaseModel, Field, model_validator

from backend.schemas.common import FiniteFloat


class Predictor(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    values: list[FiniteFloat | None] = Field(min_length=3)


class LinearRegressionRequest(BaseModel):
    outcome_name: str = Field(default="目的変数", min_length=1, max_length=80)
    outcome: list[FiniteFloat | None] = Field(min_length=3)
    predictors: list[Predictor] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def check_request(self) -> "LinearRegressionRequest":
        n = len(self.outcome)
        names: list[str] = []
        for p in self.predictors:
            if len(p.values) != n:
                raise ValueError(
                    f"説明変数「{p.name}」のデータ数({len(p.values)}件)が"
                    f"目的変数({n}件)と一致しません"
                )
            names.append(p.name)
        if len(set(names)) != len(names):
            raise ValueError("説明変数名が重複しています")
        return self


class Coefficient(BaseModel):
    name: str
    coef: float
    std_err: float
    t_value: float
    p_value: float
    ci95_low: float
    ci95_high: float
    # 標準化偏回帰係数（標準偏回帰係数）。切片は None。
    std_coef: float | None = None


class LinearRegressionResult(BaseModel):
    outcome_name: str
    coefficients: list[Coefficient]
    n_total: int
    n_used: int
    n_excluded: int
    df_model: int
    df_resid: int
    r_squared: float
    adj_r_squared: float
    f_statistic: float
    f_pvalue: float
    interpretation: str


# ── ロジスティック回帰 ────────────────────────────────────────────────────────

class LogisticRegressionRequest(BaseModel):
    outcome_name: str = Field(default="アウトカム", min_length=1, max_length=80)
    # 0/1 の2値アウトカム（1=イベント発生）
    outcome: list[FiniteFloat | None] = Field(min_length=3)
    predictors: list[Predictor] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def check_request(self) -> "LogisticRegressionRequest":
        n = len(self.outcome)
        names: list[str] = []
        for p in self.predictors:
            if len(p.values) != n:
                raise ValueError(
                    f"説明変数「{p.name}」のデータ数({len(p.values)}件)が"
                    f"アウトカム({n}件)と一致しません"
                )
            names.append(p.name)
        if len(set(names)) != len(names):
            raise ValueError("説明変数名が重複しています")
        return self


class OddsRatio(BaseModel):
    name: str
    coef: float  # 対数オッズ（回帰係数）
    odds_ratio: float  # exp(coef)
    std_err: float
    p_value: float
    or_ci95_low: float
    or_ci95_high: float


class LogisticRegressionResult(BaseModel):
    outcome_name: str
    coefficients: list[OddsRatio]
    n_total: int
    n_used: int
    n_excluded: int
    n_events: int
    pseudo_r_squared: float  # McFadden 擬似決定係数
    log_likelihood: float
    ll_null: float
    lr_pvalue: float  # 尤度比検定
    interpretation: str


# ── ポアソン回帰（一般化線形モデル / カウントデータ） ─────────────────────────

class PoissonRegressionRequest(BaseModel):
    outcome_name: str = Field(default="件数", min_length=1, max_length=80)
    # 0以上の整数カウント（例: 転倒回数・再入院回数）
    outcome: list[FiniteFloat | None] = Field(min_length=3)
    predictors: list[Predictor] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def check_request(self) -> "PoissonRegressionRequest":
        n = len(self.outcome)
        names: list[str] = []
        for p in self.predictors:
            if len(p.values) != n:
                raise ValueError(
                    f"説明変数「{p.name}」のデータ数({len(p.values)}件)が"
                    f"目的変数({n}件)と一致しません"
                )
            names.append(p.name)
        if len(set(names)) != len(names):
            raise ValueError("説明変数名が重複しています")
        return self


class RateRatio(BaseModel):
    name: str
    coef: float  # 対数率比（回帰係数）
    rate_ratio: float  # exp(coef) = 発生率比 (IRR)
    std_err: float
    p_value: float
    rr_ci95_low: float
    rr_ci95_high: float


class PoissonRegressionResult(BaseModel):
    outcome_name: str
    coefficients: list[RateRatio]
    n_total: int
    n_used: int
    n_excluded: int
    pseudo_r_squared: float  # McFadden 擬似決定係数
    log_likelihood: float
    ll_null: float
    lr_pvalue: float  # 尤度比検定
    deviance: float
    interpretation: str


# ── 混合効果モデル（線形混合モデル・ランダム切片） ─────────────────────────────

class MixedModelRequest(BaseModel):
    outcome_name: str = Field(default="目的変数", min_length=1, max_length=80)
    outcome: list[FiniteFloat | None] = Field(min_length=3)
    predictors: list[Predictor] = Field(min_length=1, max_length=20)
    group_name: str = Field(default="グループ", min_length=1, max_length=80)
    # 患者IDなどクラスタリングの単位（ランダム切片）
    group: list[str | None] = Field(min_length=3)

    @model_validator(mode="after")
    def check_request(self) -> "MixedModelRequest":
        n = len(self.outcome)
        if len(self.group) != n:
            raise ValueError(
                f"グループ「{self.group_name}」のデータ数({len(self.group)}件)が"
                f"目的変数({n}件)と一致しません"
            )
        names: list[str] = []
        for p in self.predictors:
            if len(p.values) != n:
                raise ValueError(
                    f"説明変数「{p.name}」のデータ数({len(p.values)}件)が"
                    f"目的変数({n}件)と一致しません"
                )
            names.append(p.name)
        if len(set(names)) != len(names):
            raise ValueError("説明変数名が重複しています")
        return self


class MixedCoefficient(BaseModel):
    name: str
    coef: float
    std_err: float
    z_value: float
    p_value: float
    ci95_low: float
    ci95_high: float


class MixedModelResult(BaseModel):
    outcome_name: str
    group_name: str
    coefficients: list[MixedCoefficient]
    n_total: int
    n_used: int
    n_excluded: int
    n_groups: int
    group_var: float  # ランダム切片の分散（群間分散）
    resid_var: float  # 残差分散
    icc: float  # 群内相関係数 = group_var / (group_var + resid_var)
    log_likelihood: float
    converged: bool
    interpretation: str
