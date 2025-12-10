# BCS — Battlefield Control System

**BCS** is a real-time battlefield control system designed to analyze live video streams from cameras or recorded footage.  
The system detects military equipment, identifies its type, analyzes enemy tactics, and produces tactical recommendations to support decision-making during combat operations.

Examples of system output:

- Identification of dangerous or high-priority targets
- Tactical warnings based on detected enemy behavior
- Recommendations for weapon usage (e.g. optimal ATGM strike direction)

---

## High-Level Concept

BCS is built as a **distributed, worker-based system**.

- All heavy computations and AI processing are performed on independent **workers**
- A central **server** acts only as a coordination and signaling layer
- The **client** receives live video and metadata directly from workers using **WebRTC (P2P)**

This architecture allows the system to scale horizontally and makes it possible for anyone to run a worker on their own machine.

The entire project is **open source**.

---

## Artificial Intelligence

The AI component is responsible for:

- Object detection and classification of military equipment
- Tracking targets over time
- Analyzing movement patterns and battlefield tactics
- Providing tactical recommendations

More details about the AI implementation can be found here:  
**AI repository:** [github.com/Maks6666/bcs_ai](https://github.com/Maks6666/bcs_ai)

---

## Technology Stack

### Client

- React
- TypeScript
- Vite
- WebRTC (P2P video & data streaming)

### Server

- FastAPI
- WebSockets
- Uvicorn

### Worker

- Python
- AI / video-processing stack
- WebRTC
- WebSocket connection to the server

---

## System Architecture

1. **Worker**

   - Connects to the server via WebSocket
   - Performs all AI and video processing
   - Streams processed video and data directly to the client via WebRTC

2. **Server**

   - Manages sessions and job queues
   - Assigns jobs to available workers
   - Handles signaling for WebRTC connections
   - Does _not_ process video or AI data

3. **Client**
   - Creates sessions and submits jobs
   - Receives live video stream and metadata from workers
   - Displays battlefield analysis and tactical hints in real time

---

## Project Structure

```text
.
├── bcs-worker/      # Worker node: AI, video processing, WebRTC streaming
├── bcs-api/         # Signaling & coordination server (FastAPI)
└── bcs-client/      # Web application (React)
```
