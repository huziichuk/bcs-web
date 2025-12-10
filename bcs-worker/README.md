# BCS Worker

This repository contains a worker service for the **BCS** project.  
The worker can be run locally either **inside Docker** or **directly in your local environment**.

##### AI source: [github.com/Maks6666/bcs_ai](https://github.com/Maks6666/bcs_ai)

---

## Requirements

### For Docker

- Docker
- Docker Compose (optional)

### For Local Run

- Python 3.12
- pip
- virtualenv (optional but recommended)

---

### Run with Docker

#### Build Docker Image

```bash
docker build -t bcs-worker .
```

#### Run Docker Container

```bash
docker run --gpus all --name bcs-worker -d bcs-worker
```

#### If environment variables are required:

```bash
docker run --name bcs-worker -d --env-file .env bcs-worker
```

#### To stop and remove the container:

```bash
docker stop bcs-worker
docker rm bcs-worker
```

### Run Locally (Without Docker)

1. Create Python Virtual Environment

```bash
python -m venv venv
```

Activate the virtual environment:

#### Linux / macOS:

```bash
source venv/bin/activate
```

#### Windows:

```bash
venv\Scripts\activate
```

#### 2. Install Dependencies

pip install -r requirements.txt

#### 3. Run Worker

```bash
python worker.py
```

#### Notes

    Make sure all required environment variables are configured before running the worker.

    For production usage, Docker is recommended.
