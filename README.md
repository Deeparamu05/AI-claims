# Claims App

Full-stack medical insurance claims platform with:

- React + Vite frontend
- FastAPI backend
- SQLite database
- Role-based auth (admin and patient)
- Claim upload, tracking, admin validation, and AI assistant endpoints

## Project Structure

- src: frontend React app
- backend: FastAPI API and database models
- backend/data: SQLite database storage
- backend/uploads: uploaded claim files

## Prerequisites

- Node.js 18+
- Python 3.11+ (virtual environment recommended)

## Frontend Setup

From the project root:

```bash
npm install
npm run dev
```

Frontend runs on:

- http://localhost:5173

## Backend Setup

From the project root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

Start backend from the backend folder:

```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend runs on:

- http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs

## Build and Lint

From the project root:

```bash
npm run lint
npm run build
```

## Authentication Notes

- The username admin is auto-created as an admin account on register.
- Non-admin users are created with pending status and must be approved by admin.

## Health Check

API health endpoint:

- GET /health

Expected response:

```json
{"status":"ok"}
```
