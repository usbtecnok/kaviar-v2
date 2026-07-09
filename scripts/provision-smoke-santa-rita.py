#!/usr/bin/env python3
"""One-off controlado via ECS task para provisionar o bairro TESTE Santa Rita."""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import subprocess
import sys
import time
from typing import Any, Dict, List


ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / "aws-resources.env"
ARTIFACT_DIR = ROOT / "artifacts"

DEFAULTS = {
    "AWS_REGION": "us-east-2",
    "CLUSTER_NAME": "kaviar-cluster",
    "SERVICE_NAME": "kaviar-backend-service",
    "BACKEND_CONTAINER_NAME": "kaviar-backend",
    "TARGET_NEIGHBORHOOD_ID": "TEST_SMOKE_SANTA_RITA_CENTRO",
    "TARGET_NEIGHBORHOOD_NAME": "TESTE Smoke Santa Rita Centro",
    "TARGET_CITY": "Santa Rita do Passa Quatro",
    "TARGET_TERRITORY_ID": "46755369-2fdb-4742-a441-7e1ff4254bee",
    "TARGET_CENTER_LAT": "-21.70603497",
    "TARGET_CENTER_LNG": "-47.71829819",
    "TARGET_AREA_TYPE": "BAIRRO_OFICIAL",
    "TARGET_IS_ACTIVE": "true",
    "TARGET_IS_VERIFIED": "false",
    "DRIVER_A": "driver-1783601858566",
    "DRIVER_B": "driver-1783601859180",
    "DRIVER_SCENARIO_A": "driver-1783601857593",
}


def die(msg: str, code: int = 1) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def run(cmd: List[str], *, capture: bool = False, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=check, text=True, capture_output=capture)


def load_env_file() -> None:
    if not ENV_FILE.exists():
        return
    pattern = re.compile(r'^export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$')
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        m = pattern.match(line)
        if not m:
            continue
        key, raw_value = m.groups()
        value = raw_value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        os.environ.setdefault(key, value)


def env(name: str) -> str:
    return os.environ.get(name, DEFAULTS.get(name, ""))


load_env_file()

AWS_REGION = env("AWS_REGION")
CLUSTER_NAME = env("CLUSTER_NAME")
SERVICE_NAME = env("SERVICE_NAME")
CONTAINER_NAME = env("BACKEND_CONTAINER_NAME")

TARGET_NEIGHBORHOOD_ID = env("TARGET_NEIGHBORHOOD_ID")
TARGET_NEIGHBORHOOD_NAME = env("TARGET_NEIGHBORHOOD_NAME")
TARGET_CITY = env("TARGET_CITY")
TARGET_TERRITORY_ID = env("TARGET_TERRITORY_ID")
TARGET_CENTER_LAT = env("TARGET_CENTER_LAT")
TARGET_CENTER_LNG = env("TARGET_CENTER_LNG")
TARGET_AREA_TYPE = env("TARGET_AREA_TYPE")
TARGET_IS_ACTIVE = env("TARGET_IS_ACTIVE")
TARGET_IS_VERIFIED = env("TARGET_IS_VERIFIED")
DRIVER_A = env("DRIVER_A")
DRIVER_B = env("DRIVER_B")
DRIVER_SCENARIO_A = env("DRIVER_SCENARIO_A")


def get_service_runtime() -> Dict[str, str]:
    service_json = run(
        [
            "aws", "ecs", "describe-services",
            "--cluster", CLUSTER_NAME,
            "--services", SERVICE_NAME,
            "--region", AWS_REGION,
        ],
        capture=True,
    ).stdout
    payload = json.loads(service_json)
    svc = payload["services"][0]
    net = svc["networkConfiguration"]["awsvpcConfiguration"]
    return {
        "task_definition": svc["taskDefinition"],
        "subnets": ",".join(net["subnets"]),
        "security_groups": ",".join(net["securityGroups"]),
        "assign_public_ip": net["assignPublicIp"],
    }


def fetch_task_logs(task_id: str, container_name: str) -> str:
    log_group = "/ecs/kaviar-backend"
    log_stream = f"ecs/{container_name}/{task_id}"
    cmd = [
        "aws", "logs", "get-log-events",
        "--log-group-name", log_group,
        "--log-stream-name", log_stream,
        "--region", AWS_REGION,
        "--limit", "500",
    ]
    res = run(cmd, capture=True, check=False)
    if res.returncode != 0:
        return ""
    events = json.loads(res.stdout).get("events", [])
    return "\n".join(event.get("message", "") for event in events)


def run_node_in_ecs(js_code: str, started_by: str) -> str:
    runtime = get_service_runtime()
    overrides = {
        "containerOverrides": [
            {
                "name": CONTAINER_NAME,
                "command": [
                    "node",
                    "-e",
                    js_code,
                ],
            }
        ]
    }
    run_task = run(
        [
            "aws", "ecs", "run-task",
            "--cluster", CLUSTER_NAME,
            "--launch-type", "FARGATE",
            "--platform-version", "1.4.0",
            "--task-definition", runtime["task_definition"],
            "--count", "1",
            "--started-by", started_by,
            "--network-configuration", f"awsvpcConfiguration={{subnets=[{runtime['subnets']}],securityGroups=[{runtime['security_groups']}],assignPublicIp={runtime['assign_public_ip']}}}",
            "--overrides", json.dumps(overrides),
            "--region", AWS_REGION,
            "--query", "tasks[0].taskArn",
            "--output", "text",
        ],
        capture=True,
    )
    task_arn = run_task.stdout.strip()
    if not task_arn or task_arn == "None":
        die("failed to run ECS task")
    task_id = task_arn.rsplit("/", 1)[-1]

    run([
        "aws", "ecs", "wait", "tasks-stopped",
        "--cluster", CLUSTER_NAME,
        "--tasks", task_arn,
        "--region", AWS_REGION,
    ])

    desc = json.loads(
        run(
            [
                "aws", "ecs", "describe-tasks",
                "--cluster", CLUSTER_NAME,
                "--tasks", task_arn,
                "--region", AWS_REGION,
            ],
            capture=True,
        ).stdout
    )
    container = desc["tasks"][0]["containers"][0]
    exit_code = container.get("exitCode")
    logs = fetch_task_logs(task_id, CONTAINER_NAME)
    if exit_code != 0:
        if logs:
            print(logs, file=sys.stderr)
        die(f"ECS task failed: task={task_arn} exitCode={exit_code}")
    return logs


def build_dry_run_js() -> str:
    cfg = {
        "id": TARGET_NEIGHBORHOOD_ID,
        "name": TARGET_NEIGHBORHOOD_NAME,
        "city": TARGET_CITY,
        "territoryId": TARGET_TERRITORY_ID,
        "driverA": DRIVER_A,
        "driverB": DRIVER_B,
    }
    return f"""
const {{ Client }} = require('pg');
const cfg = {json.dumps(cfg)};

async function main() {{
  const connectionString = (process.env.DATABASE_URL || '').replace(/[?&]sslmode=require/, '');
  const isLocalDb = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({{ connectionString, ...(isLocalDb ? {{}} : {{ ssl: {{ rejectUnauthorized: false }} }}) }});
  await client.connect();
  try {{
    const neighborhood = await client.query(`
      SELECT id,name,city,description,zone,administrative_region,is_active,
             center_lat,center_lng,is_verified,verified_at,verified_by,area_type,
             parent_neighborhood_id,population,area_km2,territory_id,created_at,updated_at
      FROM neighborhoods WHERE id = $1
    `, [cfg.id]);

    const conflicts = await client.query(`
      SELECT id,name,city,territory_id,is_active
      FROM neighborhoods
      WHERE name = $1 AND city = $2 AND id <> $3
      ORDER BY id
    `, [cfg.name, cfg.city, cfg.id]);

    const drivers = await client.query(`
      SELECT d.id,
             d.neighborhood_id AS "previousNeighborhoodId",
             n.name AS "previousNeighborhoodName",
             n.city AS "previousNeighborhoodCity"
      FROM drivers d
      LEFT JOIN neighborhoods n ON n.id = d.neighborhood_id
      WHERE d.id IN ($1, $2)
      ORDER BY d.id
    `, [cfg.driverA, cfg.driverB]);

    const usage = {{}};
    const usageQueries = {{
      drivers: 'SELECT COUNT(*)::int AS c FROM drivers WHERE neighborhood_id = $1',
      passengers: 'SELECT COUNT(*)::int AS c FROM passengers WHERE neighborhood_id = $1',
      community_leaders: 'SELECT COUNT(*)::int AS c FROM community_leaders WHERE neighborhood_id = $1',
      neighborhood_geofences: 'SELECT COUNT(*)::int AS c FROM neighborhood_geofences WHERE neighborhood_id = $1',
      rides_pickup: 'SELECT COUNT(*)::int AS c FROM rides WHERE pickup_neighborhood_id = $1',
      rides_dropoff: 'SELECT COUNT(*)::int AS c FROM rides WHERE dropoff_neighborhood_id = $1',
      rides_v2_origin: 'SELECT COUNT(*)::int AS c FROM rides_v2 WHERE origin_neighborhood_id = $1',
      rides_v2_dest: 'SELECT COUNT(*)::int AS c FROM rides_v2 WHERE dest_neighborhood_id = $1',
      kaviar_groups: 'SELECT COUNT(*)::int AS c FROM kaviar_groups WHERE neighborhood_id = $1',
    }};
    for (const [key, sql] of Object.entries(usageQueries)) {{
      const r = await client.query(sql, [cfg.id]);
      usage[key] = r.rows[0].c;
    }}

    const payload = {{
      targetNeighborhood: neighborhood.rows[0] || null,
      nameConflicts: conflicts.rows,
      drivers: drivers.rows,
      usage,
      plan: {{
        willCreateNeighborhood: neighborhood.rows.length === 0,
        willAbortOnNameConflict: conflicts.rows.length > 0,
        targetNeighborhoodId: cfg.id,
        targetNeighborhoodName: cfg.name,
        city: cfg.city,
        territoryId: cfg.territoryId,
        driverIds: [cfg.driverA, cfg.driverB],
      }}
    }};
    console.log(JSON.stringify(payload));
  }} finally {{
    await client.end();
  }}
}}

main().catch((err) => {{
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
}});
"""


def build_apply_js() -> str:
    cfg = {
        "id": TARGET_NEIGHBORHOOD_ID,
        "name": TARGET_NEIGHBORHOOD_NAME,
        "city": TARGET_CITY,
        "territoryId": TARGET_TERRITORY_ID,
        "centerLat": TARGET_CENTER_LAT,
        "centerLng": TARGET_CENTER_LNG,
        "areaType": TARGET_AREA_TYPE,
        "isActive": TARGET_IS_ACTIVE.lower() == "true",
        "isVerified": TARGET_IS_VERIFIED.lower() == "true",
        "driverA": DRIVER_A,
        "driverB": DRIVER_B,
    }
    return f"""
const {{ Client }} = require('pg');
const cfg = {json.dumps(cfg)};

async function main() {{
  const connectionString = (process.env.DATABASE_URL || '').replace(/[?&]sslmode=require/, '');
  const isLocalDb = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({{ connectionString, ...(isLocalDb ? {{}} : {{ ssl: {{ rejectUnauthorized: false }} }}) }});
  await client.connect();
  try {{
    await client.query('BEGIN');
    await client.query('LOCK TABLE neighborhoods IN SHARE ROW EXCLUSIVE MODE');
    await client.query('LOCK TABLE drivers IN SHARE ROW EXCLUSIVE MODE');

    const conflict = await client.query(
      'SELECT 1 FROM neighborhoods WHERE name=$1 AND city=$2 AND id<>$3 LIMIT 1',
      [cfg.name, cfg.city, cfg.id]
    );
    if (conflict.rowCount > 0) throw new Error('Neighborhood name/city already exists under a different id');

    await client.query(`
      INSERT INTO neighborhoods (
        id,name,city,description,zone,administrative_region,is_active,
        center_lat,center_lng,is_verified,area_type,parent_neighborhood_id,
        population,area_km2,territory_id,created_at,updated_at
      ) VALUES ($1,$2,$3,NULL,NULL,NULL,$4,$5,$6,$7,$8,NULL,NULL,NULL,$9,NOW(),NOW())
      ON CONFLICT (id) DO UPDATE SET
        name=EXCLUDED.name, city=EXCLUDED.city, description=EXCLUDED.description,
        zone=EXCLUDED.zone, administrative_region=EXCLUDED.administrative_region,
        is_active=EXCLUDED.is_active, center_lat=EXCLUDED.center_lat,
        center_lng=EXCLUDED.center_lng, is_verified=EXCLUDED.is_verified,
        area_type=EXCLUDED.area_type, parent_neighborhood_id=EXCLUDED.parent_neighborhood_id,
        population=EXCLUDED.population, area_km2=EXCLUDED.area_km2,
        territory_id=EXCLUDED.territory_id, updated_at=NOW()
    `, [cfg.id, cfg.name, cfg.city, cfg.isActive, cfg.centerLat, cfg.centerLng, cfg.isVerified, cfg.areaType, cfg.territoryId]);

    const driverUpdate = await client.query(
      `UPDATE drivers
       SET neighborhood_id=$1, updated_at=NOW()
       WHERE id IN ($2,$3) AND neighborhood_id IS DISTINCT FROM $1`,
      [cfg.id, cfg.driverA, cfg.driverB]
    );

    await client.query('COMMIT');
    console.log(JSON.stringify({{ ok: true, driverRowsUpdated: driverUpdate.rowCount }}));
  }} catch (err) {{
    await client.query('ROLLBACK');
    throw err;
  }} finally {{
    await client.end();
  }}
}}

main().catch((err) => {{
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
}});
"""


def build_rollback_js(plan: Dict[str, Any]) -> str:
    drivers = {row["id"]: row for row in plan.get("drivers", [])}
    target = plan.get("targetNeighborhood")
    payload = {
        "id": TARGET_NEIGHBORHOOD_ID,
        "driverA": DRIVER_A,
        "driverB": DRIVER_B,
        "driverAPrev": drivers.get(DRIVER_A, {}).get("previousNeighborhoodId"),
        "driverBPrev": drivers.get(DRIVER_B, {}).get("previousNeighborhoodId"),
        "targetBefore": target,
    }
    return f"""
const {{ Client }} = require('pg');
const cfg = {json.dumps(payload)};

async function main() {{
  const connectionString = (process.env.DATABASE_URL || '').replace(/[?&]sslmode=require/, '');
  const isLocalDb = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new Client({{ connectionString, ...(isLocalDb ? {{}} : {{ ssl: {{ rejectUnauthorized: false }} }}) }});
  await client.connect();
  try {{
    await client.query('BEGIN');
    await client.query('LOCK TABLE neighborhoods IN SHARE ROW EXCLUSIVE MODE');
    await client.query('LOCK TABLE drivers IN SHARE ROW EXCLUSIVE MODE');

    await client.query(
      `UPDATE drivers
       SET neighborhood_id = CASE id
         WHEN $1 THEN $2
         WHEN $3 THEN $4
         ELSE neighborhood_id
       END,
       updated_at = NOW()
       WHERE id IN ($1,$3)`,
      [cfg.driverA, cfg.driverAPrev, cfg.driverB, cfg.driverBPrev]
    );

    if (cfg.targetBefore) {{
      const t = cfg.targetBefore;
      await client.query(
        `UPDATE neighborhoods
         SET name=$2, city=$3, description=$4, zone=$5, administrative_region=$6,
             is_active=$7, center_lat=$8, center_lng=$9, is_verified=$10,
             verified_at=$11, verified_by=$12, area_type=$13, parent_neighborhood_id=$14,
             population=$15, area_km2=$16, territory_id=$17, updated_at=$18
         WHERE id=$1`,
        [
          cfg.id,
          t.name,
          t.city,
          t.description,
          t.zone,
          t.administrative_region,
          t.is_active,
          t.center_lat,
          t.center_lng,
          t.is_verified,
          t.verified_at,
          t.verified_by,
          t.area_type,
          t.parent_neighborhood_id,
          t.population,
          t.area_km2,
          t.territory_id,
          t.updated_at,
        ]
      );
    }} else {{
      const refs = await client.query(`
        SELECT c.conrelid::regclass::text AS table_name, a.attname AS column_name
        FROM pg_constraint c
        JOIN unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ord) ON TRUE
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ck.attnum
        WHERE c.contype = 'f'
          AND c.confrelid = 'neighborhoods'::regclass
      `);

      for (const ref of refs.rows) {{
        const sql = `SELECT COUNT(*)::int AS c FROM ${{ref.table_name}} WHERE ${{ref.column_name}} = $1`;
        const count = await client.query(sql, [cfg.id]);
        if (count.rows[0].c > 0) {{
          throw new Error(`Cannot remove neighborhood ${{cfg.id}}, still referenced by ${{count.rows[0].c}} rows in ${{ref.table_name}}.${{ref.column_name}}`);
        }}
      }}

      await client.query('DELETE FROM neighborhoods WHERE id=$1', [cfg.id]);
    }}

    await client.query('COMMIT');
    console.log(JSON.stringify({{ ok: true }}));
  }} catch (err) {{
    await client.query('ROLLBACK');
    throw err;
  }} finally {{
    await client.end();
  }}
}}

main().catch((err) => {{
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
}});
"""


def build_validate_js() -> str:
    payload = {
    "driverA": DRIVER_SCENARIO_A,
        "driverB": DRIVER_A,
        "driverC": DRIVER_B,
    }
    return f"""
const jwt = require('jsonwebtoken');
const cfg = {json.dumps(payload)};
const baseUrl = 'https://api.kaviar.com.br';

if (!process.env.JWT_SECRET) {{
  throw new Error('JWT_SECRET missing in runtime');
}}

function makeToken(driverId) {{
  return jwt.sign(
    {{ userId: driverId, userType: 'DRIVER', email: `${{driverId}}@oneoff.local`, status: 'approved' }},
    process.env.JWT_SECRET,
    {{ expiresIn: '15m' }}
  );
}}

async function callJson(url, options = {{}}) {{
  const res = await fetch(url, options);
  const text = await res.text();
  let json;
  try {{ json = text ? JSON.parse(text) : null; }} catch {{ json = {{ raw: text }}; }}
  return {{ status: res.status, body: json }};
}}

async function validateDriver(driverId) {{
  const token = makeToken(driverId);
  const headers = {{ Authorization: `Bearer ${{token}}`, 'Content-Type': 'application/json' }};

  const me = await callJson(`${{baseUrl}}/api/drivers/me`, {{ headers }});
  const availability = await callJson(`${{baseUrl}}/api/v2/drivers/me/availability`, {{
    method: 'POST',
    headers,
    body: JSON.stringify({{ availability: 'online' }}),
  }});
  const municipalStatus = await callJson(`${{baseUrl}}/api/v2/driver/municipal-status`, {{ headers }});

  return {{
    driverId,
    me,
    availability,
    municipalStatus,
  }};
}}

async function main() {{
  const a = await validateDriver(cfg.driverA);
  const b = await validateDriver(cfg.driverB);
  const c = await validateDriver(cfg.driverC);

  const summary = {{
    driverA: a,
    driverB: b,
    driverC: c,
    checks: {{
      aNoMunicipalBlock: !['MUNICIPAL_AUTH_REQUIRED', 'MUNICIPAL_LOCATION_REQUIRED'].includes(a.availability?.body?.error || ''),
      bNeighborhoodFilled: Boolean(b.me?.body?.driver?.neighborhood_id),
      cNeighborhoodFilled: Boolean(c.me?.body?.driver?.neighborhood_id),
      bBlockedMunicipalAuthRequired: b.availability?.body?.error === 'MUNICIPAL_AUTH_REQUIRED',
      bAvailabilityNoMunicipalLocationRequired: !(b.availability?.body?.error === 'MUNICIPAL_LOCATION_REQUIRED'),
      cAvailabilityNoMunicipalLocationRequired: !(c.availability?.body?.error === 'MUNICIPAL_LOCATION_REQUIRED'),
      bMunicipalStatusWaitingReview: b.municipalStatus?.body?.data?.authorization?.status === 'WAITING_CITY_HALL_REVIEW',
      bMunicipalOperationGateFalse: b.municipalStatus?.body?.data?.operationGate?.allowed === false,
      cMunicipalStatusApproved: c.municipalStatus?.body?.data?.authorization?.status === 'APPROVED_BY_CITY_HALL',
      cMunicipalOperationGateTrue: c.municipalStatus?.body?.data?.operationGate?.allowed === true,
    }}
  }};

  console.log(JSON.stringify(summary));
}}

main().catch((err) => {{
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
}});
"""


def extract_json_line(logs: str) -> Dict[str, Any]:
    for line in reversed([l.strip() for l in logs.splitlines() if l.strip()]):
        if line.startswith("{") and line.endswith("}"):
            return json.loads(line)
    die("No JSON payload found in ECS logs")
    return {}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["dry-run", "apply", "rollback", "validate"])
    parser.add_argument("--plan-file")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    plan_path = pathlib.Path(args.plan_file) if args.plan_file else ARTIFACT_DIR / "smoke-santa-rita-plan.json"

    if args.mode in {"apply", "rollback"} and not args.yes:
        die("Use --yes to continue")

    if args.mode == "dry-run":
        logs = run_node_in_ecs(build_dry_run_js(), "smoke-santa-rita-dry-run")
        plan = extract_json_line(logs)
        plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n")
        print(f"PLAN_FILE={plan_path}")
        print(json.dumps(plan, indent=2, ensure_ascii=False))
        return

    if args.mode == "validate":
      logs = run_node_in_ecs(build_validate_js(), "smoke-santa-rita-validate")
      result = extract_json_line(logs)
      print(json.dumps(result, ensure_ascii=False, indent=2))
      return

    if not plan_path.exists() or plan_path.stat().st_size == 0:
        die(f"Plan file not found or empty: {plan_path}")
    plan = json.loads(plan_path.read_text())

    if args.mode == "apply":
        if plan.get("plan", {}).get("willAbortOnNameConflict"):
            die("Dry-run found name/city conflict. Fix before apply.")
        logs = run_node_in_ecs(build_apply_js(), "smoke-santa-rita-apply")
        result = extract_json_line(logs)
        print(json.dumps(result, ensure_ascii=False))
        print(f"PLAN_FILE={plan_path}")
        print(f"ROLLBACK_COMMAND=python3 scripts/provision-smoke-santa-rita.py rollback --plan-file {plan_path} --yes")
        return

    logs = run_node_in_ecs(build_rollback_js(plan), "smoke-santa-rita-rollback")
    result = extract_json_line(logs)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()