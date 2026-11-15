import asyncio
import os
from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import SOS, Rescuer, SOSAck, Victim, Via

# Supabase Postgres, reached directly with asyncpg. DATABASE_URL comes from the
# environment only (Supabase dashboard -> Connect -> connection string).
SCHEMA = """
CREATE TABLE IF NOT EXISTS sos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bag TEXT NOT NULL,
    "at" BIGINT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high')),
    name TEXT NOT NULL DEFAULT '',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    payload JSONB NOT NULL,
    via TEXT NOT NULL CHECK (via IN ('internet', 'mesh')),
    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Assigned', 'Rescued')),
    received BIGINT NOT NULL DEFAULT extract(epoch FROM now())::bigint,
    UNIQUE (bag, "at")
);
-- Supabase exposes public tables through its REST API. RLS on with no policies
-- means the anon/public key sees nothing; this backend connects as a role that
-- bypasses RLS.
ALTER TABLE sos ENABLE ROW LEVEL SECURITY;
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    # statement_cache_size=0: required behind Supabase's pooler (pgbouncer
    # transaction mode), which can't keep prepared statements.
    app.state.pool = await asyncpg.create_pool(
        os.environ["DATABASE_URL"],
        min_size=1,
        max_size=5,
        command_timeout=5,
        statement_cache_size=0,
    )
    async with app.state.pool.acquire() as conn:
        await conn.execute(SCHEMA)
    yield
    await app.state.pool.close()


app = FastAPI(title="LiveBuoy API", lifespan=lifespan)

# Frontend origin only. Never "*" with credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["content-type"],
)


@app.exception_handler(asyncpg.PostgresError)
@app.exception_handler(OSError)
@app.exception_handler(asyncio.TimeoutError)
async def db_unavailable(request: Request, exc: Exception):
    # Tell the client the alert was NOT stored so it retries or falls back to mesh.
    # Never include exc text: it can contain the connection string or row data.
    return JSONResponse({"error": "storage unavailable"}, status_code=503)


def to_victim(r: asyncpg.Record) -> Victim:
    return Victim(
        id=r["id"],
        name=r["name"] or r["bag"],
        area="",  # ponytail: no reverse geocoding yet; frontend can show lat/lng
        people=1,  # ponytail: not in the SOS payload; default until the app sends it
        severity=3 if r["priority"] == "critical" else 2,
        last=r["received"],
        status=r["status"],
        via=r["via"],
        lat=r["lat"],
        lng=r["lng"],
    )


@app.get("/api/health")
async def health():
    # Dependency-free on purpose: the app gives this 2.5 s to pick internet vs mesh.
    return {"status": "ok"}


@app.post("/api/sos", response_model=SOSAck, status_code=202)
async def post_sos(
    request: Request,
    alert: SOS,
    # ponytail: unauthenticated hint set by the FloodMesh gateway. Add a gateway
    # token before this is exposed publicly, otherwise anyone can claim "mesh".
    via: Via = Query(default="internet"),
):
    loc = alert.location
    # Persist BEFORE acknowledging. ON CONFLICT dedupes on (bag, at); no row
    # returned means we already had it.
    new_id = await request.app.state.pool.fetchval(
        """INSERT INTO sos (bag, "at", priority, name, lat, lng, payload, via)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
           ON CONFLICT (bag, "at") DO NOTHING
           RETURNING id""",
        alert.bag,
        alert.at,
        alert.priority,
        alert.profile.name,
        loc.lat if loc else None,
        loc.lng if loc else None,
        alert.model_dump_json(),
        via,
    )
    # Do not log the body: it carries precise location and medical fields.
    return SOSAck(duplicate=new_id is None)


@app.get("/api/victims", response_model=list[Victim])
async def list_victims(request: Request):
    # ponytail: no auth. This returns precise location, so gate it to authorised
    # responders (e.g. verify a Supabase Auth JWT) before any public deployment.
    rows = await request.app.state.pool.fetch(
        """SELECT * FROM sos
           ORDER BY CASE priority WHEN 'critical' THEN 0 ELSE 1 END, "at" DESC"""
    )
    return [to_victim(r) for r in rows]


@app.patch("/api/victims/{victim_id}", response_model=Victim)
async def advance_victim(request: Request, victim_id: int):
    # No body: clients can't set status. One atomic statement moves it one step,
    # so concurrent PATCHes can't skip a step.
    pool = request.app.state.pool
    row = await pool.fetchrow(
        """UPDATE sos
           SET status = CASE status WHEN 'Pending' THEN 'Assigned' ELSE 'Rescued' END
           WHERE id = $1 AND status IN ('Pending', 'Assigned')
           RETURNING *""",
        victim_id,
    )
    if row is None:
        exists = await pool.fetchval("SELECT 1 FROM sos WHERE id = $1", victim_id)
        raise HTTPException(409 if exists else 404, "already rescued" if exists else "victim not found")
    return to_victim(row)


@app.get("/api/rescuers", response_model=list[Rescuer])
async def list_rescuers():
    # ponytail: static demo data around Shah Alam / Klang. Replace with a table
    # fed by rescuer GPS pings.
    return [
        Rescuer(id=1, lat=3.0738, lng=101.5183),
        Rescuer(id=2, lat=3.0433, lng=101.4450),
    ]