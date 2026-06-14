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


def test_parse_csv_shift_jis() -> None:
    result = parse_csv(_CSV_SJIS, "japanese.csv")

    assert result.n_rows == 2
    assert [column.name for column in result.columns] == ["年齢", "スコア"]


def test_parse_csv_column_types() -> None:
    result = parse_csv(_CSV, "test.csv")

    age_col = next(c for c in result.columns if c.name == "age")
    group_col = next(c for c in result.columns if c.name == "group")

    assert age_col.dtype == "continuous"
    assert group_col.dtype == "categorical"
    assert age_col.role == "continuous"
    assert group_col.role == "categorical"


def test_parse_csv_missing_detection() -> None:
    result = parse_csv(_CSV, "test.csv")

    score_col = next(c for c in result.columns if c.name == "score")
    assert score_col.n_missing == 1
    assert score_col.n_valid == 4


def test_parse_csv_values_for_continuous() -> None:
    result = parse_csv(_CSV, "test.csv")

    age_col = next(c for c in result.columns if c.name == "age")
    assert age_col.values == [20.0, 22.0, 24.0, 26.0, 28.0]


def test_parse_csv_numeric_conversion_failure_counts_as_missing() -> None:
    result = parse_csv(b"value\n1\n2\ninvalid\n4\n5\n", "mixed.csv")

    column = result.columns[0]
    assert column.dtype == "continuous"
    assert column.n_valid == 4
    assert column.n_missing == 1
    assert column.values == [1.0, 2.0, None, 4.0, 5.0]


def test_parse_csv_keeps_categorical_values_for_all_columns() -> None:
    result = parse_csv(_CSV, "test.csv")

    age_col = next(c for c in result.columns if c.name == "age")
    group_col = next(c for c in result.columns if c.name == "group")
    assert age_col.cat_values == ["20", "22", "24", "26", "28"]
    assert group_col.values == []
    assert group_col.cat_values == ["A", "B", "A", "B", "A"]


def test_parse_csv_suggests_id_and_ordinal_roles() -> None:
    result = parse_csv(
        b"patient_id,stage,outcome\n1,1,0\n2,2,1\n3,3,1\n4,2,0\n5,1,1\n",
        "roles.csv",
    )

    roles = {column.name: column.role for column in result.columns}
    assert roles == {"patient_id": "id", "stage": "ordinal", "outcome": "categorical"}


def test_parse_csv_detects_privacy_risks() -> None:
    result = parse_csv(
        "患者氏名,生年月日,連絡先,score\n"
        "田中太郎,1980-01-01,tanaka@example.com,10\n"
        "佐藤花子,1990-02-03,sato@example.com,20\n".encode(),
        "privacy.csv",
    )

    risks = {column.name: column.privacy_risk for column in result.columns}
    assert risks == {
        "患者氏名": "direct_identifier",
        "生年月日": "birth_date",
        "連絡先": "contact",
        "score": None,
    }


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
