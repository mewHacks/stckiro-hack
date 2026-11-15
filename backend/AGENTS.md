# AGENTS.md: LiveBuoy backend (FastAPI)

Guidance for AI coding agents (and humans) working in `backend/`. The backend is **one folder**. Don't create backend code anywhere else. The frontend is Next.js in `frontend/` and has its own file structure; don't edit it from here.

> **Heads-up:** `app.py` / `requirements.txt` are still the initial **Flask** scaffold. The target stack is **FastAPI**. Replace the scaffold; don't mix both frameworks.

## What the backend does
LiveBuoy is a smart waterproof backpack with an offline SOS beacon and a rescuer dashboard. The backend:
1. Receives SOS reports (over the internet, or relayed from the FloodMesh gateway).
2. Stores victims, rescuers and rescue status.
3. Serves the rescuer dashboard and the victim app.

## Stack and commands
- Python 3.11+, **FastAPI**, **Uvicorn**, **Pydantic v2**.
- Setup: `cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
- Run (dev): `.venv/bin/uvicorn main:app --reload --port 5000`
- Docs UI: `http://localhost:5000/docs`

The frontend defaults to `http://localhost:5000` (`NEXT_PUBLIC_API_URL`), so keep dev on **port 5000** unless the frontend env is changed too.

## Contract the frontend already uses (don't break)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Must return `{"status": "ok"}` fast. The app uses it with a **2.5 s timeout** to decide internet vs mesh delivery. Keep it dependency-free (no DB call). |
| POST | `/api/sos` | Fire-and-forget from the app, so respond quickly with 202/200. Be idempotent: the same `bag` + `at` may arrive twice (internet and mesh relay). Body is the **full alert** (all data is always sent): `{bag, at, reason, priority ("critical"\|"high"), battery, profile: {name, medical, contacts[]}, location: {lat, lng, accuracyM}, beacon: {connected, firmware}}`. `reason "Battery dying (LastSignal)"` marks the final alert a phone sends at 5% battery. Validate with Pydantic and sort the dashboard by `priority` first. |

Planned (frontend currently uses mock data in `frontend/src/lib/data.ts`; match these shapes):
- `GET /api/victims`: list of `{id, name, area, people, severity (1-3), last, status, via, lat, lng}`.
  - `status`: `"Pending" | "Assigned" | "Rescued"`
  - `via`: `"internet" | "mesh"`
- `PATCH /api/victims/{id}`: advance `status` (Pending → Assigned → Rescued).
- `GET /api/rescuers`: `[{id, lat, lng}]`.
- The frontend maps coordinates around Shah Alam / Klang (about 3.07 N, 101.52 E). Return real `lat`/`lng`, not the mock x/y.

## Rules
- **CORS:** allow only the frontend origin, read from env `FRONTEND_ORIGIN` (default `http://localhost:3000`). Never `*` with credentials.
- **Secrets:** read from environment variables only. **Never read, print or commit `.env`**. Don't hardcode keys, tokens or DB passwords. If you need a variable's name, ask the owner.
- **Privacy:** precise personal location and medical data go only to authorised responders. Don't log full coordinates or medical fields. Keep victim photos and profiles out of public endpoints.
- **Validation at the boundary:** every request body is a Pydantic model. Reject bad input with 422. Don't trust `severity`, `status` or coordinates from clients.
- **Reliability:** SOS delivery must never be lost. Persist before acknowledging, dedupe on `(bag, at)`, and return fast. Failure paths matter more than the happy path here.
- **Async:** use `async def` handlers; never block the event loop with sync I/O.
- Keep it simple: no extra framework, queue or service unless there is a measured need. Mark deliberate shortcuts with a `# ponytail:` comment naming the ceiling and the upgrade path.

## Layout (keep it flat)
```
backend/
  main.py          # FastAPI app, CORS, routes
  models.py        # Pydantic schemas
  requirements.txt
  AGENTS.md
  .venv/           # git-ignored
```
Split into more files only when `main.py` gets unwieldy. Storage can start in memory or SQLite (`# ponytail:` note), then move to Postgres.

## Before you finish
- `curl localhost:5000/api/health` returns `{"status":"ok"}`.
- `curl -X POST localhost:5000/api/sos -H 'content-type: application/json' -d '{"bag":"FS-2041","at":1}'` succeeds.
- Add one runnable check for any non-trivial logic (a small `test_*.py` using `fastapi.testclient`).
- Update `requirements.txt` and this file if the contract changes.
