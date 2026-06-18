from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from pydantic import BaseModel

from backend.schemas.graph import (
    BarplotRequest,
    BoxplotRequest,
    BoxplotResult,
    ExportRequest,
    HistogramRequest,
    KaplanMeierRequest,
    PairedPlotRequest,
    PlotlyFigure,
    ROCRequest,
    ROCResponse,
    ScatterRequest,
)
from backend.services.graph.plotly_charts import (
    barplot_figure,
    boxplot_figure,
    histogram_figure,
    km_figure,
    roc_figure,
    scatter_figure,
    paired_figure,
)


class ROCResult(BaseModel):
    figure: PlotlyFigure
    stats: ROCResponse

router = APIRouter(prefix="/graph", tags=["graph"])


@router.post("/roc", response_model=ROCResult)
def roc(request: ROCRequest) -> ROCResult:
    try:
        fig, stats = roc_figure(request)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return ROCResult(figure=fig, stats=stats)


@router.post("/kaplan-meier", response_model=PlotlyFigure)
def kaplan_meier(request: KaplanMeierRequest) -> PlotlyFigure:
    return km_figure(request)


@router.post("/barplot", response_model=PlotlyFigure)
def barplot(request: BarplotRequest) -> PlotlyFigure:
    return barplot_figure(request)


@router.post("/boxplot", response_model=BoxplotResult)
def boxplot(request: BoxplotRequest) -> BoxplotResult:
    try:
        from backend.services.graph.boxplot_comparison import compute_boxplot_comparison
        return BoxplotResult(
            figure=boxplot_figure(request),
            comparison=compute_boxplot_comparison(request),
        )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="群間差の検定には analysis オプションが必要です（pip install '.[analysis]'）",
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/histogram", response_model=PlotlyFigure)
def histogram(request: HistogramRequest) -> PlotlyFigure:
    return histogram_figure(request)


@router.post("/scatter", response_model=PlotlyFigure)
def scatter(request: ScatterRequest) -> PlotlyFigure:
    return scatter_figure(request)


@router.post("/paired", response_model=PlotlyFigure)
def paired(request: PairedPlotRequest) -> PlotlyFigure:
    return paired_figure(request)


@router.post("/export")
def export(request: ExportRequest) -> Response:
    try:
        from backend.services.graph.matplotlib_export import export_bytes
        data, mime = export_bytes(request)
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="論文出力には graph オプションが必要です（pip install '.[graph]'）",
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"論文出力の生成に失敗しました: {e}")

    ext = request.format
    filename = f"statseed_graph.{ext}"
    return Response(
        content=data,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
