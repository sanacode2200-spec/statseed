import io
from typing import Literal

from backend.schemas.upload import ColumnInfo, UploadResponse

_PREVIEW_ROWS = 10
_MAX_ROWS = 10_000
_MAX_COLS = 200


def parse_csv(content: bytes, filename: str) -> UploadResponse:
    import pandas as pd

    try:
        df = pd.read_csv(io.BytesIO(content), nrows=_MAX_ROWS)
    except Exception as e:
        raise ValueError(f"CSVの読み込みに失敗しました: {e}")

    return _build_response(df, filename)


def parse_excel(content: bytes, filename: str) -> UploadResponse:
    import pandas as pd

    try:
        df = pd.read_excel(io.BytesIO(content), nrows=_MAX_ROWS)
    except Exception as e:
        raise ValueError(f"Excelの読み込みに失敗しました: {e}")

    return _build_response(df, filename)


def _build_response(df, filename: str) -> UploadResponse:
    import pandas as pd
    import numpy as np

    df = df.iloc[:, :_MAX_COLS]
    n_rows, n_cols = df.shape

    columns: list[ColumnInfo] = []
    for col in df.columns:
        series = df[col]
        numeric = pd.to_numeric(series, errors="coerce")
        is_numeric = numeric.notna().sum() >= series.notna().sum() * 0.8

        n_missing = int(series.isna().sum())
        n_valid = n_rows - n_missing

        if is_numeric:
            dtype: Literal["continuous", "categorical"] = "continuous"
            values: list[float | None] = [
                None if pd.isna(v) else float(v) for v in numeric.tolist()
            ]
        else:
            dtype = "categorical"
            values = []

        preview = [None if pd.isna(v) else str(v) for v in series.head(_PREVIEW_ROWS).tolist()]

        columns.append(
            ColumnInfo(
                name=str(col),
                dtype=dtype,
                n_valid=n_valid,
                n_missing=n_missing,
                values=values,
                preview=preview,
            )
        )

    preview_rows: list[dict[str, str | None]] = []
    for _, row in df.head(_PREVIEW_ROWS).iterrows():
        preview_rows.append(
            {str(c): None if pd.isna(row[c]) else str(row[c]) for c in df.columns}
        )

    return UploadResponse(
        n_rows=n_rows,
        n_cols=n_cols,
        filename=filename,
        columns=columns,
        preview_rows=preview_rows,
    )
