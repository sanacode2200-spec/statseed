from pydantic import BaseModel, Field, field_validator


class DescriptiveRequest(BaseModel):
    variable_name: str = Field(default="変数", min_length=1, max_length=80)
    values: list[float | None] = Field(min_length=1)

    @field_validator("values")
    @classmethod
    def require_at_least_one_number(cls, values: list[float | None]) -> list[float | None]:
        if not any(value is not None for value in values):
            raise ValueError("少なくとも1つの数値を入力してください")
        return values


class DescriptiveResponse(BaseModel):
    variable_name: str
    n: int
    missing: int
    mean: float | None
    sd: float | None
    median: float
    q1: float
    q3: float
    iqr: float
    minimum: float
    maximum: float
    ci95_low: float | None
    ci95_high: float | None
    shapiro_wilk_p: float | None
    interpretation: str


class CategoricalRequest(BaseModel):
    variable_name: str = Field(default="変数", min_length=1, max_length=80)
    values: list[str | None] = Field(min_length=1)

    @field_validator("values")
    @classmethod
    def require_at_least_one_value(cls, values: list[str | None]) -> list[str | None]:
        if not any(v is not None and v.strip() != "" for v in values):
            raise ValueError("少なくとも1つの値を入力してください")
        return values


class CategoryCount(BaseModel):
    label: str
    count: int
    percent: float


class CategoricalResponse(BaseModel):
    variable_name: str
    n: int
    missing: int
    categories: list[CategoryCount]
    interpretation: str
