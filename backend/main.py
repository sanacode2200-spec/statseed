import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import descriptive, graph, guide, regression, table1, test, upload

DEFAULT_CORS_ORIGIN_REGEX = (
    r"(?:https://.*\.vercel\.app|http://(?:localhost|127\.0\.0\.1)(?::\d+)?)"
)

enable_docs = os.getenv("STATSEED_ENABLE_DOCS") == "1"
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "STATSEED_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
# 開発サーバーは空き状況により3001以降で起動することがある。
# VercelのプレビューURLとローカルの任意ポートを正規表現で許可する。
cors_origin_regex = os.getenv(
    "STATSEED_CORS_ORIGIN_REGEX",
    DEFAULT_CORS_ORIGIN_REGEX,
)

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
    allow_origin_regex=cors_origin_regex or None,
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
app.include_router(regression.router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
