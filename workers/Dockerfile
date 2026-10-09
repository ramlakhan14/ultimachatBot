###################
# BUILD FOR PRODUCTION
###################

FROM python:3.10-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && \
    apt-get install -y -q \
        openssl curl libpq-dev python3-dev build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY . /app
COPY .env.docker /app/.env

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Start Celery worker
CMD celery -A worker worker -l info --concurrency 2