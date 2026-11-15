FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Explicit copy so .env / .venv can never end up in the image.
# If you split main.py into more files later, add them here.
COPY main.py models.py ./

RUN useradd --create-home app
USER app

EXPOSE 5000
# Render injects $PORT; locally it falls back to 5000.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-5000}"]