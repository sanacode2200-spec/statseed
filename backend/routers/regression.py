from fastapi import APIRouter, HTTPException

from backend.schemas.regression import (
    LinearRegressionRequest,
    LinearRegressionResult,
)
from backend.services.stats.regression import run_linear_regression

router = APIRouter(prefix="/regression", tags=["regression"])


@router.post("/linear", response_model=LinearRegressionResult)
def linear(request: LinearRegressionRequest) -> LinearRegressionResult:
    try:
        return run_linear_regression(request)
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="回帰分析には analysis オプションが必要です（pip install '.[analysis]'）",
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
