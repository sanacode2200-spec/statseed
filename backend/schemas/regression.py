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
