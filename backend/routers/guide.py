from fastapi import APIRouter

from backend.schemas.guide import GuideRequest, GuideResponse
from backend.services.guide import suggest

router = APIRouter(prefix="/guide", tags=["guide"])


@router.post("/suggest", response_model=GuideResponse)
def guide_suggest(request: GuideRequest) -> GuideResponse:
    return suggest(request)
