from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from backend.schemas.graph import (
    BoxplotRequest,
    ExportRequest,
    HistogramRequest,
    PlotlyFigure,
    ScatterRequest,
)
from backend.services.graph.plotly_charts import (
    boxplot_figure,
    histogram_figure,
    scatter_figure,
)

router = APIRouter(prefix="/graph", tags=["graph"])


@router.post("/boxplot", response_model=PlotlyFigure)
def boxplot(request: BoxplotRequest) -> PlotlyFigure:
    return boxplot_figure(request)


@router.post("/histogram", response_model=PlotlyFigure)
def histogram(request: HistogramRequest) -> PlotlyFigure:
    return histogram_figure(request)


@router.post("/scatter", response_model=PlotlyFigure)
def scatter(request: ScatterRequest) -> PlotlyFigure:
    return scatter_figure(request)


@router.post("/export")
def export(request: ExportRequest) -> Response:
    try:
        from backend.services.graph.matplotlib_export import export_bytes
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="論文出力には graph オプションが必要です（pip install '.[graph]'）",
        )

    data, mime = export_bytes(request)
    ext = request.format
    filename = f"statseed_graph.{ext}"
    return Response(
        content=data,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
