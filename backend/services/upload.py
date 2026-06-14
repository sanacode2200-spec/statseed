import io
import re
from typing import Literal

from backend.schemas.upload import ColumnInfo, ColumnRole, PrivacyRisk, UploadResponse

_PREVIEW_ROWS = 10
_MAX_ROWS = 10_000
_MAX_COLS = 200
_ID_NAMES = {
    "id",
    "patientid",
    "subjectid",
    "caseid",
    "recordid",
    "患者id",
    "症例id",
    "症例番号",
    "患者番号",
    "被験者番号",
    "登録番号",
}
_DIRECT_IDENTIFIER_NAMES = {
    "name",
    "fullname",
    "patientname",
    "subjectname",
    "氏名",
    "名前",
    "患者氏名",
    "患者名",
    "被験者氏名",
    "カルテ番号",
    "診察券番号",
    "保険証番号",
    "マイナンバー",
    "medicalrecordnumber",
}
_CONTACT_NAMES = {
    "email",
    "mail",
    "メール",
    "メールアドレス",
    "phone",
    "telephone",
    "tel",
    "電話",
    "電話番号",
    "携帯",
    "携帯番号",
    "連絡先",
}
_BIRTH_DATE_NAMES = {
    "birthdate",
    "dateofbirth",
    "dob",
    "生年月日",
    "誕生日",
}
_ADDRESS_NAMES = {
    "address",
    "住所",
    "所在地",
    "郵便番号",
    "zipcode",
    "postalcode",
    "郵便",
}
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PHONE_RE = re.compile(r"^(?:\+?\d[\d\s()\-]{8,}\d)$")


def _normalized_name(name: str) -> str:
    return re.sub(r"[\s_\-]", "", name).lower()


def _detect_privacy_risk(
    name: str, cat_values: list[str | None], role: ColumnRole
) -> tuple[PrivacyRisk | None, str | None]:
    normalized_name = _normalized_name(name)
    if normalized_name in _DIRECT_IDENTIFIER_NAMES or role == "id":
        return "direct_identifier", "氏名・患者IDなど個人を直接識別できる列の可能性があります"
    if normalized_name in _CONTACT_NAMES:
        return "contact", "連絡先情報を含む列の可能性があります"
    if normalized_name in _BIRTH_DATE_NAMES:
        return "birth_date", "生年月日を含む列の可能性があります"
    if normalized_name in _ADDRESS_NAMES:
        return "address", "住所情報を含む列の可能性があります"

    values = [value.strip() for value in cat_values if value and value.strip()]
    if len(values) >= 2:
        email_matches = sum(bool(_EMAIL_RE.match(value)) for value in values)
        phone_matches = sum(bool(_PHONE_RE.match(value)) for value in values)
        threshold = max(2, int(len(values) * 0.8))
        if email_matches >= threshold:
            return "contact", "値の大部分がメールアドレス形式です"
        if phone_matches >= threshold:
            return "contact", "値の大部分が電話番号形式です"
    return None, None


def _suggest_role(series, numeric, is_numeric: bool, name: str) -> tuple[ColumnRole, str]:
    import pandas as pd

    normalized_name = _normalized_name(name)
    valid = series.dropna()
    n_valid = len(valid)
    n_unique = int(valid.nunique())
    unique_ratio = n_unique / n_valid if n_valid else 0

    if normalized_name in _ID_NAMES or normalized_name.endswith("id"):
        return "id", "列名からID候補と判定しました"
    if not is_numeric:
        parsed_dates = pd.to_datetime(valid, errors="coerce", format="mixed")
        if n_valid >= 3 and int(parsed_dates.notna().sum()) >= n_valid * 0.8:
            return "date", "値の大部分を日付として解釈できました"
        return "categorical", "文字列を含むためカテゴリ変数と判定しました"

    valid_numeric = numeric.dropna()
    is_integer = bool(len(valid_numeric)) and bool(
        ((valid_numeric % 1).abs() < 1e-9).all()
    )
    numeric_unique = int(valid_numeric.nunique())
    if is_integer and n_valid >= 10 and unique_ratio >= 0.95:
        return "id", "整数値のほぼすべてが一意のためID候補と判定しました"
    if is_integer and numeric_unique <= 2:
        return "categorical", "0/1など少数の整数値のためカテゴリ候補と判定しました"
    if is_integer and numeric_unique <= 10 and unique_ratio < 0.8:
        return "ordinal", "少数の整数値のため順序尺度候補と判定しました"
    return "continuous", "数値列のため連続変数と判定しました"


def parse_csv(content: bytes, filename: str) -> UploadResponse:
    import pandas as pd

    try:
        df = pd.read_csv(io.BytesIO(content), nrows=_MAX_ROWS)
    except UnicodeDecodeError:
        try:
            df = pd.read_csv(io.BytesIO(content), nrows=_MAX_ROWS, encoding="cp932")
        except Exception as e:
            raise ValueError(f"CSVの読み込みに失敗しました: {e}")
    except Exception as e:
        raise ValueError(f"CSVの読み込みに失敗しました: {e}")

    try:
        return _build_response(df, filename)
    except ValueError as e:
        raise ValueError(f"CSVの読み込みに失敗しました: {e}") from e


def parse_excel(content: bytes, filename: str) -> UploadResponse:
    import pandas as pd

    try:
        df = pd.read_excel(io.BytesIO(content), nrows=_MAX_ROWS)
    except Exception as e:
        raise ValueError(f"Excelの読み込みに失敗しました: {e}")

    try:
        return _build_response(df, filename)
    except ValueError as e:
        raise ValueError(f"Excelの読み込みに失敗しました: {e}") from e


def _build_response(df, filename: str) -> UploadResponse:
    import pandas as pd

    df = df.iloc[:, :_MAX_COLS]
    n_rows, n_cols = df.shape
    if n_rows == 0 or n_cols == 0:
        raise ValueError("データ行と列を含むファイルを選択してください")

    columns: list[ColumnInfo] = []
    for col in df.columns:
        series = df[col]
        numeric = pd.to_numeric(series, errors="coerce")
        is_numeric = numeric.notna().sum() >= series.notna().sum() * 0.8
        role, role_reason = _suggest_role(series, numeric, is_numeric, str(col))

        cat_values: list[str | None] = [
            None if pd.isna(v) else str(v) for v in series.tolist()
        ]
        privacy_risk, privacy_reason = _detect_privacy_risk(str(col), cat_values, role)
        if is_numeric:
            dtype: Literal["continuous", "categorical"] = "continuous"
            n_missing = int(numeric.isna().sum())
            n_valid = n_rows - n_missing
            values: list[float | None] = [
                None if pd.isna(v) else float(v) for v in numeric.tolist()
            ]
        else:
            dtype = "categorical"
            n_missing = int(series.isna().sum())
            n_valid = n_rows - n_missing
            values = []

        preview = [None if pd.isna(v) else str(v) for v in series.head(_PREVIEW_ROWS).tolist()]

        columns.append(
            ColumnInfo(
                name=str(col),
                dtype=dtype,
                role=role,
                role_reason=role_reason,
                privacy_risk=privacy_risk,
                privacy_reason=privacy_reason,
                n_valid=n_valid,
                n_missing=n_missing,
                values=values,
                cat_values=cat_values,
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
