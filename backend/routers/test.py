from fastapi import APIRouter

from backend.schemas.test import (
    ChiSquareRequest,
    CorrelationRequest,
    CorrelationResult,
    MultiGroupRequest,
    PairedRequest,
    TestResult,
    TwoGroupRequest,
)
from backend.services.stats.hypothesis import (
    run_anova,
    run_chisquare,
    run_correlation,
    run_fisher,
    run_kruskal,
    run_mannwhitney,
    run_ttest_ind,
    run_ttest_paired,
    run_wilcoxon,
)

router = APIRouter(prefix="/test", tags=["test"])


@router.post("/ttest", response_model=TestResult)
def ttest_ind(request: TwoGroupRequest) -> TestResult:
    return run_ttest_ind(request)


@router.post("/mannwhitney", response_model=TestResult)
def mannwhitney(request: TwoGroupRequest) -> TestResult:
    return run_mannwhitney(request)


@router.post("/ttest-paired", response_model=TestResult)
def ttest_paired(request: PairedRequest) -> TestResult:
    return run_ttest_paired(request)


@router.post("/wilcoxon", response_model=TestResult)
def wilcoxon(request: PairedRequest) -> TestResult:
    return run_wilcoxon(request)


@router.post("/anova", response_model=TestResult)
def anova(request: MultiGroupRequest) -> TestResult:
    return run_anova(request)


@router.post("/kruskal", response_model=TestResult)
def kruskal(request: MultiGroupRequest) -> TestResult:
    return run_kruskal(request)


@router.post("/chisquare", response_model=TestResult)
def chisquare(request: ChiSquareRequest) -> TestResult:
    return run_chisquare(request)


@router.post("/fisher", response_model=TestResult)
def fisher(request: ChiSquareRequest) -> TestResult:
    return run_fisher(request)


@router.post("/correlation", response_model=CorrelationResult)
def correlation(request: CorrelationRequest) -> CorrelationResult:
    return run_correlation(request)
