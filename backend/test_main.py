import os

import pytest

# Use a throwaway database, never your real Supabase project: this test wipes the table.
TEST_URL = os.getenv("TEST_DATABASE_URL")
if not TEST_URL:
    pytest.skip("set TEST_DATABASE_URL to a disposable Postgres", allow_module_level=True)
os.environ["DATABASE_URL"] = TEST_URL

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402


def test_flow():
    with TestClient(app) as c:
        c.portal.call(c.app.state.pool.execute, "TRUNCATE sos RESTART IDENTITY")

        assert c.get("/api/health").json() == {"status": "ok"}

        r = c.post("/api/sos", json={"bag": "FS-2041", "at": 1})
        assert r.status_code == 202 and r.json()["duplicate"] is False

        r = c.post("/api/sos?via=mesh", json={"bag": "FS-2041", "at": 1})
        assert r.status_code == 202 and r.json()["duplicate"] is True

        c.post("/api/sos", json={
            "bag": "FS-9", "at": 2, "priority": "critical",
            "location": {"lat": 3.07, "lng": 101.52},
        })
        victims = c.get("/api/victims").json()
        assert [v["severity"] for v in victims] == [3, 2]

        assert c.post("/api/sos", json={"bag": "x"}).status_code == 422
        assert c.post("/api/sos", json={"bag": "x", "at": 1, "priority": "low"}).status_code == 422

        vid = victims[0]["id"]
        assert c.patch(f"/api/victims/{vid}").json()["status"] == "Assigned"
        assert c.patch(f"/api/victims/{vid}").json()["status"] == "Rescued"
        assert c.patch(f"/api/victims/{vid}").status_code == 409
        assert c.patch("/api/victims/999").status_code == 404

        assert len(c.get("/api/rescuers").json()) >= 1