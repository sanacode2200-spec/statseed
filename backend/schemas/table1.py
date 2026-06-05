from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field, model_validator

from backend.schemas.common import FiniteFloat


class ContinuousVariable(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    type: Literal["continuous"] = "continuous"
    values: list[FiniteFloat | None] = Field(min_length=1)
    display: Literal["mean_sd", "median_iqr"] = "mean_sd"


class CategoricalVariable(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    type: Literal["categorical"] = "categorical"
    values: list[str | None] = Field(min_length=1)


Table1Variable = Annotated[
    Union[ContinuousVariable, CategoricalVariable],
    Field(discriminator="type"),
]


class Table1Request(BaseModel):
    variables: list[Table1Variable] = Field(min_length=1)
    group_values: list[str | None] | None = None
    group_name: str = Field(default="群", min_length=1, max_length=80)

    @model_validator(mode="after")
    def check_group_length(self) -> "Table1Request":
        if self.group_values is None:
            return self
        n = len(self.group_values)
        for var in self.variables:
            if len(var.values) != n:
                raise ValueError(
                    f"変数「{var.name}」のデータ数({len(var.values)}件)が"
                    f"群変数({n}件)と一致しません"
                )
        return self


class Table1Row(BaseModel):
    variable: str
    indent: bool = False
    overall: str
    groups: dict[str, str] | None = None
    p_value: str | None = None
    test_name: str | None = None


class Table1Result(BaseModel):
    rows: list[Table1Row]
    group_names: list[str] | None = None
    n_overall: int
    n_by_group: dict[str, int] | None = None
