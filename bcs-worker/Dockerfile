FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    libglib2.0-0 \
    libavformat-dev \
    libavdevice-dev \
    libavfilter-dev \
    libavcodec-dev \
    libswscale-dev \
    libopus-dev \
    libvpx-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip

COPY requirements.txt .

RUN sed -i '/^torch[>=<]/d' requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "worker.py"]
