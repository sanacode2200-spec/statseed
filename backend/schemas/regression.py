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
