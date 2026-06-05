from fastapi import APIRouter

from backend.schemas.descriptive import (
    CategoricalRequest,
    CategoricalResponse,
    DescriptiveRequest,
    DescriptiveResponse,
)
from backend.services.stats.descriptive import summarize_categorical, summarize_continuous

router = APIRouter(tags=["descriptive"])


@router.post("/descriptive", response_model=DescriptiveResponse)
def descriptive(request: DescriptiveRequest) -> DescriptiveResponse:
    return summarize_continuous(request)


@router.post("/descriptive/categorical", response_model=CategoricalResponse)
def descriptive_categorical(request: CategoricalRequest) -> CategoricalResponse:
    return summarize_categorical(request)
