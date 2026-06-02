from fastapi import APIRouter

from backend.schemas.descriptive import DescriptiveRequest, DescriptiveResponse
from backend.services.stats.descriptive import summarize_continuous

router = APIRouter(tags=["descriptive"])


@router.post("/descriptive", response_model=DescriptiveResponse)
def descriptive(request: DescriptiveRequest) -> DescriptiveResponse:
    return summarize_continuous(request)
