from typing import Literal

from pydantic import BaseModel


class ColumnInfo(BaseModel):
    name: str
    dtype: Literal["continuous", "categorical"]
    n_valid: int
    n_missing: int
    values: list[float | None]
    preview: list[str | None]


class UploadResponse(BaseModel):
    n_rows: int
    n_cols: int
    filename: str
    columns: list[ColumnInfo]
    preview_rows: list[dict[str, str | None]]
