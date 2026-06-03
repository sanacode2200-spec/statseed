import io
import os

import pytest

os.environ["STATSEED_ENABLE_SCIPY"] = "1"

from backend.services.upload import parse_csv, parse_excel


_CSV = b"""age,score,group
20,85.5,A
22,90.0,B
24,,A
26,78.3,B
28,92.1,A
"""

_CSV_SJIS = "年齢,スコア\n20,85\n22,90\n".encode("shift-jis")


def test_parse_csv_basic() -> None:
    result = parse_csv(_CSV, "test.csv")

    assert result.n_rows == 5
    assert result.n_cols == 3
    assert result.filename == "test.csv"


def test_parse_csv_column_types() -> None:
    result = parse_csv(_CSV, "test.csv")

    age_col = next(c for c in result.columns if c.name == "age")
    group_col = next(c for c in result.columns if c.name == "group")

    assert age_col.dtype == "continuous"
    assert group_col.dtype == "categorical"


def test_parse_csv_missing_detection() -> None:
    result = parse_csv(_CSV, "test.csv")

    score_col = next(c for c in result.columns if c.name == "score")
    assert score_col.n_missing == 1
    assert score_col.n_valid == 4


def test_parse_csv_values_for_continuous() -> None:
    result = parse_csv(_CSV, "test.csv")

    age_col = next(c for c in result.columns if c.name == "age")
    assert age_col.values == [20.0, 22.0, 24.0, 26.0, 28.0]


def test_parse_csv_categorical_has_empty_values() -> None:
    result = parse_csv(_CSV, "test.csv")

    group_col = next(c for c in result.columns if c.name == "group")
    assert group_col.values == []


def test_parse_csv_preview_rows() -> None:
    result = parse_csv(_CSV, "test.csv")

    assert len(result.preview_rows) == 5
    assert result.preview_rows[0]["age"] == "20"
    assert result.preview_rows[2]["score"] is None


def test_parse_csv_invalid_raises() -> None:
    with pytest.raises(ValueError, match="CSV"):
        parse_csv(b"\x00\x01\x02binary garbage\xff", "bad.csv")


def test_parse_excel_basic() -> None:
    import pandas as pd

    df = pd.DataFrame({"体重": [55.0, 60.5, None, 70.0], "性別": ["男", "女", "男", "女"]})
    buf = io.BytesIO()
    df.to_excel(buf, index=False)
    content = buf.getvalue()

    result = parse_excel(content, "test.xlsx")

    assert result.n_rows == 4
    assert result.n_cols == 2

    weight_col = next(c for c in result.columns if c.name == "体重")
    assert weight_col.dtype == "continuous"
    assert weight_col.n_missing == 1
    assert None in weight_col.values
