from fastapi import APIRouter

from backend.schemas.table1 import Table1Request, Table1Result
from backend.services.stats.table1 import build_table1

router = APIRouter(tags=["table1"])


@router.post("/table1", response_model=Table1Result)
def table1(request: Table1Request) -> Table1Result:
    return build_table1(request)
