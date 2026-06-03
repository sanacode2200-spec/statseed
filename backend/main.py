import os

from fastapi import FastAPI

from backend.routers import descriptive, graph, guide, test, upload

enable_docs = os.getenv("STATSEED_ENABLE_DOCS") == "1"

app = FastAPI(
    title="Statseed API",
    description="コメディカル向け医療統計WebアプリのAPI",
    version="0.1.0",
    docs_url="/docs" if enable_docs else None,
    redoc_url="/redoc" if enable_docs else None,
    openapi_url="/openapi.json" if enable_docs else None,
)

app.include_router(descriptive.router, prefix="/api")
app.include_router(test.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(guide.router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
