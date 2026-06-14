from typing import Literal

from pydantic import BaseModel


ColumnRole = Literal["id", "continuous", "ordinal", "categorical", "date", "exclude"]
PrivacyRisk = Literal["direct_identifier", "contact", "birth_date", "address"]


class ColumnInfo(BaseModel):
    name: str
    dtype: Literal["continuous", "categorical"]
    role: ColumnRole
    role_reason: str
    privacy_risk: PrivacyRisk | None = None
    privacy_reason: str | None = None
    n_valid: int
    n_missing: int
    values: list[float | None]
    cat_values: list[str | None]
    preview: list[str | None]


class UploadResponse(BaseModel):
    n_rows: int
    n_cols: int
    filename: str
    columns: list[ColumnInfo]
    preview_rows: list[dict[str, str | None]]
