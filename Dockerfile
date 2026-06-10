FROM python:3.11-slim

WORKDIR /app

# 論文用グラフ出力（matplotlib）で日本語フォントを使うため
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY backend ./backend

RUN pip install --no-cache-dir ".[analysis,graph]"

ENV STATSEED_ENABLE_SCIPY=1

EXPOSE 8000

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
