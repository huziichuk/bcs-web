# BCS Signaling Server

This is the FastAPI-based signaling/queue server for the **BCS** project.  
It handles:

- WebSocket connections from workers
- WebSocket connections from clients to track queue position
- Session creation and job queueing
- Simple health and video listing endpoints

The server is intended to be run via **uvicorn** using dependencies from `requirements.txt`.

---

## Requirements

- Python 3.12
- `pip`
- (Optional but recommended) `venv` for virtual environments
- `requirements.txt` in the project root

---

## Installation and Local Run

### 1. Create and activate virtual environment

```bash
python -m venv venv
```

#### Activate the virtual environment:

##### Linux / macOS:

```bash
source venv/bin/activate
```

##### Windows

```bash
venv\Scripts\activate.bat
```

#### 2. Install dependencies

```bash
pip install -r requirements.txt
```

#### 3. Run the server with uvicorn

##### Run FastAPI instance:

```bash
uvicorn app:app --reload
```
