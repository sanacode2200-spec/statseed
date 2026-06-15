from fastapi import APIRouter, HTTPException

from backend.schemas.regression import (
    LinearRegressionRequest,
    LinearRegressionResult,
    LogisticRegressionRequest,
    LogisticRegressionResult,
)
from backend.services.stats.regression import (
    run_linear_regression,
    run_logistic_regression,
)

router = APIRouter(prefix="/regression", tags=["regression"])

_DEP_ERROR = "回帰分析には analysis オプションが必要です（pip install '.[analysis]'）"


@router.post("/linear", response_model=LinearRegressionResult)
def linear(request: LinearRegressionRequest) -> LinearRegressionResult:
    try:
        return run_linear_regression(request)
    except ImportError:
        raise HTTPException(status_code=503, detail=_DEP_ERROR)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/logistic", response_model=LogisticRegressionResult)
def logistic(request: LogisticRegressionRequest) -> LogisticRegressionResult:
    try:
        return run_logistic_regression(request)
    except ImportError:
        raise HTTPException(status_code=503, detail=_DEP_ERROR)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
