"""Sync .env.local into Vercel project env (production + preview).

Usage: VERCEL_TOKEN=... python3 scripts/vercel-env-sync.py
Reads keys from .env.local, overrides app URL entries for production.
"""
import json
import os
import urllib.request

TOKEN = os.environ["VERCEL_TOKEN"]
TEAM_ID = "team_8NG0OPL8udjx7VapcSBA7A5m"
PROJECT_ID = "prj_WHvJCOGeEGlO3kuyqjXDLYXWs4Aw"
APP_URL = "https://dark-hub-g1asss-projects.vercel.app"

API = "https://api.vercel.com"


def call(method, path, body=None):
    req = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read() or b"{}")


def read_env(path):
    out = {}
    for line in open(path):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        out[k.strip()] = v
    return out


SKIP = {"UPLOAD_TMP_DIR", "FFMPEG_PATH", "FFPROBE_PATH", "CLAMSCAN_PATH"}

env = read_env("/Users/glass/Desktop/Veloura/.env.local")
env["APP_BASE_URL"] = APP_URL
env["NEXTAUTH_URL"] = APP_URL
env["ALLOWED_ORIGINS"] = APP_URL

existing = call("GET", f"/v9/projects/{PROJECT_ID}/env?teamId={TEAM_ID}").get("envs", [])
for e in existing:
    call("DELETE", f"/v9/projects/{PROJECT_ID}/env/{e['id']}?teamId={TEAM_ID}")
    print("deleted", e["key"])

created = 0
for key, value in env.items():
    if key in SKIP or value == "":
        print("skipped", key)
        continue
    call(
        "POST",
        f"/v10/projects/{PROJECT_ID}/env?teamId={TEAM_ID}",
        {
            "key": key,
            "value": value,
            "type": "encrypted",
            "target": ["production", "preview"],
        },
    )
    created += 1
print(f"created {created} env vars")
