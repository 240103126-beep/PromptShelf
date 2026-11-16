FROM node:24-alpine AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_USE_MOCK=false
RUN npm run build

FROM python:3.12-slim
ARG APP_VERSION=local
LABEL org.opencontainers.image.source="https://github.com/240103126-beep/PromptShelf" \
      org.opencontainers.image.revision="$APP_VERSION"
WORKDIR /app
COPY backend/requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY backend/app ./app
COPY --from=frontend /build/dist ./static
RUN useradd --create-home appuser && mkdir -p /app/data && chown -R appuser:appuser /app
USER appuser
ENV STATIC_DIR=/app/static APP_VERSION=$APP_VERSION
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
