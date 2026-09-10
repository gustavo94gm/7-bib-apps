# PC Management Dashboard — Design

## Context

The battalion runs a wired LAN where every machine has a fixed IP in the
`10.25.x.x` range. There is no inventory or health-monitoring tool for the
fleet of PCs (Windows and Linux). The long-term goal is a full management
suite (inventory dashboard + remote access via self-hosted RustDesk), but
this spec covers only the first sub-project: an agent that reports machine
info, and a dashboard inside the existing 7-bib-apps admin area to view it.
Remote access is an explicitly separate, later sub-project.

## Goals

- A lightweight agent, written in Go, runs on every Windows and Linux PC in
  the battalion and reports machine info to the 7-bib-apps server every 30
  seconds.
- An admin dashboard page lists every machine that has ever reported in,
  showing live status (online/offline) and current stats.
- New machines register themselves automatically on first heartbeat — no
  manual approval step.
- Only the current snapshot per machine is kept (no historical time series
  in this iteration).

## Non-goals

- Remote access / remote control (RustDesk or otherwise) — future sub-project.
- Historical metrics / graphs over time.
- Security/compliance auditing fields (AV status, firewall status, Windows
  Update status) — explicitly cut from scope by the user.
- Heavy inventory data (installed software list, running processes).
- Any control actions from the dashboard (restart agent, run commands,
  etc.) in this iteration — read-only monitoring only.

## Architecture

```
[Go agent, each PC] --HTTPS POST every 30s--> [Nuxt server: POST /api/agents/heartbeat]
                                                        |
                                                        v
                                              [Postgres: `machines` table, upsert by agent_id]
                                                        ^
                                                        |
[Admin dashboard, app/pages/admin/network.vue] <--GET /api/machines-- [Nuxt server]
```

No new services are introduced. The existing Nuxt server (with its Drizzle/
Postgres setup) gains two API routes and one table. The agent is a
standalone Go binary living in its own top-level folder, decoupled from the
Nuxt app — it only talks to it over HTTP.

## Data model

New table `machines` in `server/db/schema.ts`, following the file's existing
conventions (tabs, `snake_case` DB columns via explicit column name,
camelCase field names):

```ts
export const machines = pgTable("machines", {
	agentId: text("agent_id").primaryKey(),
	hostname: varchar({ length: 255 }),
	ip: varchar({ length: 45 }),
	mac: varchar({ length: 32 }),
	os: varchar({ length: 32 }),
	osVersion: varchar("os_version", { length: 100 }),
	arch: varchar({ length: 16 }),
	cpuModel: varchar("cpu_model", { length: 255 }),
	cpuCores: integer("cpu_cores"),
	cpuUsagePercent: real("cpu_usage_percent"),
	ramTotalMb: integer("ram_total_mb"),
	ramUsedPercent: real("ram_used_percent"),
	diskTotalGb: real("disk_total_gb"),
	diskFreeGb: real("disk_free_gb"),
	loggedInUser: varchar("logged_in_user", { length: 255 }),
	uptimeSeconds: bigint("uptime_seconds", { mode: "number" }),
	networkAdapters: jsonb("network_adapters"),
	gateway: varchar({ length: 45 }),
	dns: jsonb(),
	agentVersion: varchar("agent_version", { length: 32 }),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
});
```

`agentId` is a UUID the agent generates on first run and persists locally
(`C:\ProgramData\pc-agent\id` on Windows, `/etc/pc-agent/id` on Linux) —
hostnames alone are not guaranteed unique across the fleet, so this is the
stable identity key. Every heartbeat is an upsert on `agentId`; there is no
history table, so a row always reflects the machine's latest known state.

`networkAdapters` is a JSON array of `{ name, ip, mac }`. `gateway` and
`dns` are best-effort: gathering them portably (Windows vs Linux) is more
involved than the other fields, so a failed lookup just leaves them null
rather than failing the whole heartbeat. GPU info was considered and cut —
there's no reliable cross-platform way to read it without shelling out to
per-vendor tools, and it wasn't a hard requirement.

**Online/offline** is derived at read time, not stored: a machine is
"online" if `lastSeenAt` is within 90 seconds (3x the heartbeat interval).

## Server API

### `POST /api/agents/heartbeat`

- Not covered by the session-based `server/middleware/auth.ts` gate — added
  to that file's existing `PUBLIC_ROUTES` allow-list (matched by method +
  path, same pattern already used for `/api/tickets` and the lookup GETs).
- Instead, validates a static bearer token: `Authorization: Bearer <token>`
  compared against `process.env.AGENT_TOKEN`. Missing/invalid token → 401.
- Body: JSON matching the fields above (minus `lastSeenAt`, which the
  server sets to `now()`). Missing required fields (`hostname`) → 400.
- On success: upserts the `machines` row by `agentId`. Returns `204`.

### `GET /api/machines`

- Goes through the normal `canAccess` gate in `server/middleware/auth.ts`
  (not a visitor path, so admin + infor only — same rule already governing
  every other `/api/*` admin route).
- Returns all rows from `machines`, newest-checked-in first.

## Go agent

New top-level folder `agent/` in the repo, a standalone Go module (own
`go.mod`) — it is not part of the Nuxt build.

**Dependencies** (both chosen because writing the equivalent by hand is
substantially more code than the task warrants):
- `github.com/shirou/gopsutil/v3` — cross-platform CPU/RAM/disk/network
  stats (Windows + Linux).
- `github.com/kardianos/service` — cross-platform service lifecycle, so the
  agent installs as a Windows Service or a systemd unit without
  hand-written OS-specific service-control code.

**Config**: a small file next to the binary (or `/etc/pc-agent/config.yaml`
on Linux, `C:\ProgramData\pc-agent\config.yaml` on Windows) holding the
server URL and the shared `AGENT_TOKEN`. The agent-generated UUID lives in
a separate `id` file next to it, created on first run if absent.

**Collection loop**: every 30 seconds, gather:
- `gopsutil`: CPU model/cores/usage, RAM total/used %, disk total/free,
  hostname, OS, OS version, arch, uptime, network interfaces.
- Logged-in user: shell out to `query user` (Windows) or `who` (Linux) and
  parse the first active session. Best-effort — empty string if the command
  fails or output can't be parsed (e.g. no interactive session).
- Gateway/DNS: best-effort via `ip route`/`resolv.conf` parsing on Linux,
  `ipconfig` output parsing on Windows; left null on failure.

POSTs the resulting JSON to `${serverURL}/api/agents/heartbeat` with the
bearer token. On failure (network blip, server restart), logs locally and
retries on the next tick with capped exponential backoff — never crashes or
exits.

**Distribution**: cross-compiled for `windows/amd64` and `linux/amd64` via
`GOOS`/`GOARCH`. Install docs cover: copying the binary + config, then
`agent.exe install` / `./agent install` (via `kardianos/service`) to
register and start the OS service.

## Dashboard UI

New page `app/pages/admin/network.vue`, added to the "Administração" nav
section in `app/layouts/default.vue` alongside Reports/Users/Database —
same visibility rule already in place there (`isAdmin`, which already
includes both `admin` and `infor`). Read-only in this iteration: no buttons
to act on a machine, since remote actions are the follow-up sub-project.

Table columns: status dot (online/offline), hostname, IP, OS, CPU %, RAM %,
disk free/total, logged-in user, last seen (relative time, e.g. "há 2 min").
Clicking a row opens a detail modal/drawer with the rest of the fields (MAC,
network adapters, gateway/DNS, uptime, agent version).

Follows the same fetch-on-mount + manual refresh pattern already used by
`AdminCrudTable.vue` and `admin/users.vue` — a `$fetch('/api/machines')`
call, no new client-side state library.

## Error handling

- **Agent → server**: retried with backoff, logged locally, agent process
  never exits on a failed heartbeat.
- **Server**: rejects bad auth (401) and malformed payloads (400) without
  touching the `machines` table; a heartbeat is idempotent so retries after
  a transient failure are safe.
- **Dashboard**: if `/api/machines` fails, show the existing toast-based
  error pattern already used elsewhere in the admin pages (see
  `AdminCrudTable.vue`'s `fetchItems`).

## Testing

- **Agent**: a small `_test.go` exercising the collector functions (asserts
  they return without panicking and produce a JSON-serializable struct);
  manual smoke test running the built binary against a local dev server and
  confirming a row appears in `machines`.
- **Server**: manual `curl` checks for `POST /api/agents/heartbeat` (valid
  token succeeds, invalid token 401, missing hostname 400) and for
  `GET /api/machines` respecting the existing `canAccess` role gate.
- **Dashboard**: manual browser check — machine appears after first agent
  heartbeat, status flips to offline ~90s after the agent is stopped.

## Open questions / follow-ups (explicitly out of scope here)

- Remote access (RustDesk self-hosted) integration — separate sub-project.
- Historical metrics/graphs, if later needed.
- Security/audit fields (AV, firewall, Windows Update), if later needed.
