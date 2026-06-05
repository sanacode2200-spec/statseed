from fastapi import APIRouter, HTTPException, UploadFile

from backend.schemas.upload import UploadResponse
from backend.services.upload import parse_csv, parse_excel

router = APIRouter(prefix="/upload", tags=["upload"])

_CSV_MIME = {"text/csv", "application/csv", "text/plain", "application/octet-stream"}
_EXCEL_MIME = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",
}
_MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/csv", response_model=UploadResponse)
async def upload_csv(file: UploadFile) -> UploadResponse:
    content = await _read_file(file, _MAX_BYTES)
    try:
        return parse_csv(content, file.filename or "data.csv")
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="データ読み込みには analysis オプションが必要です（pip install '.[analysis]'）",
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/excel", response_model=UploadResponse)
async def upload_excel(file: UploadFile) -> UploadResponse:
    if file.filename and not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=422, detail=".xlsx または .xls ファイルを選択してください")
    content = await _read_file(file, _MAX_BYTES)
    try:
        return parse_excel(content, file.filename or "data.xlsx")
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="データ読み込みには analysis オプションが必要です（pip install '.[analysis]'）",
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


async def _read_file(file: UploadFile, max_bytes: int) -> bytes:
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"ファイルサイズが上限（{max_bytes // 1024 // 1024}MB）を超えています",
        )
    return content
