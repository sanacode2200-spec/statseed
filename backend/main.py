from fastapi import FastAPI

from backend.routers import descriptive

app = FastAPI(
    title="Statseed API",
    description="コメディカル向け医療統計WebアプリのAPI",
    version="0.1.0",
)

app.include_router(descriptive.router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
