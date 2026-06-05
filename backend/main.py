import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import descriptive, graph, guide, table1, test, upload

enable_docs = os.getenv("STATSEED_ENABLE_DOCS") == "1"
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "STATSEED_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app = FastAPI(
    title="Statseed API",
    description="コメディカル向け医療統計WebアプリのAPI",
    version="0.1.0",
    docs_url="/docs" if enable_docs else None,
    redoc_url="/redoc" if enable_docs else None,
    openapi_url="/openapi.json" if enable_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(descriptive.router, prefix="/api")
app.include_router(test.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(guide.router, prefix="/api")
app.include_router(table1.router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
