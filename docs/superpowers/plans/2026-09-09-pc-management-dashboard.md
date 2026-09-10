# PC Management Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Go agent reports live machine info (hardware, OS, logged-in user, network) from every battalion PC (Windows + Linux) to the 7-bib-apps server every 30s, and an admin dashboard page shows the current state of the whole fleet.

**Architecture:** Standalone Go agent (own module, `agent/`) POSTs a JSON snapshot to a new Nuxt server route (`POST /api/agents/heartbeat`, static bearer-token auth) which upserts one row per machine into a new Postgres table (`machines`, via the existing Drizzle setup). A new admin page reads `GET /api/machines` (session-gated like every other admin route) and renders the fleet, computing online/offline from `lastSeenAt`.

**Tech Stack:** Go 1.22+ (`gopsutil/v3` for metrics, `kardianos/service` for cross-platform service install), Nuxt 4 / Drizzle ORM / Postgres (existing stack), Vue 3 / Nuxt UI (existing stack).

**Spec:** `docs/superpowers/specs/2026-09-09-pc-management-dashboard-design.md`

## Global Constraints

- Only the current snapshot per machine is stored — no history table (spec: Data model).
- No remote-control actions in this iteration; the dashboard is read-only (spec: Non-goals).
- No security/audit fields (AV, firewall, Windows Update) and no installed-software/process lists (spec: Non-goals).
- `agentId` (agent-generated UUID, persisted locally by the agent) is the stable identity key — never the hostname (spec: Data model).
- Gateway/DNS/network-adapter collection is best-effort: a failed OS-specific lookup must leave the field empty/null, never fail the heartbeat (spec: Data model, Agent).
- New machines register automatically on first heartbeat — no approval step (spec: Goals).
- `GET /api/machines` must go through the existing `canAccess` role gate (admin + infor only); `POST /api/agents/heartbeat` is bearer-token-only, not session-gated (spec: Server API).
- Follow existing project conventions: manual field validation (no zod) matching `server/api/categories.post.ts`'s style; Drizzle schema style (tabs, explicit snake_case column names) matching `server/db/schema.ts`; no new JS/TS test framework — this repo has none, so server/dashboard verification is manual (curl / browser), matching how every other route here is verified. Go code gets real `go test` coverage since Go's stdlib testing needs no new dependency.

---

### Task 1: `machines` table

**Files:**
- Modify: `server/db/schema.ts`

**Interfaces:**
- Produces: Drizzle table `machines` with columns `agentId` (text, PK), `hostname`, `ip`, `mac`, `os`, `osVersion`, `arch` (varchar), `cpuModel` (varchar), `cpuCores` (integer), `cpuUsagePercent` (real), `ramTotalMb` (integer), `ramUsedPercent` (real), `diskTotalGb` (real), `diskFreeGb` (real), `loggedInUser` (varchar), `uptimeSeconds` (bigint/number mode), `networkAdapters` (jsonb), `gateway` (varchar), `dns` (jsonb), `agentVersion` (varchar), `lastSeenAt` (timestamp with timezone, not null). Later tasks import this as `import { machines } from './db/schema'` (server code) or `from '../db/schema'` (relative, matching existing routes).

- [ ] **Step 1: Add the `machines` table to the schema**

Open `server/db/schema.ts`. Its top import line currently reads:

```ts
import { pgTable, pgEnum, bigserial, bigint, varchar, text, timestamp, date, time, primaryKey, unique } from "drizzle-orm/pg-core"
```

Replace it with (adds `integer`, `real`, `jsonb`):

```ts
import { pgTable, pgEnum, bigserial, bigint, varchar, text, timestamp, date, time, primaryKey, unique, integer, real, jsonb } from "drizzle-orm/pg-core"
```

Then append this table definition at the end of the file:

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
	uptimeSeconds: bigint("uptime_seconds", { mode: 'number' }),
	networkAdapters: jsonb("network_adapters"),
	gateway: varchar({ length: 45 }),
	dns: jsonb(),
	agentVersion: varchar("agent_version", { length: 32 }),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
});
```

- [ ] **Step 2: Push the schema to the dev database**

Run: `pnpm drizzle-kit push`

When prompted, accept creating the new `machines` table (this project has no committed migration files — schema changes are pushed directly, matching how the existing tables were created).

- [ ] **Step 3: Verify the table exists**

Run: `docker compose -f docker-compose.dev.yml exec db psql -U postgres -d 7-bib-db -c "\d machines"`

Expected: a column listing showing `agent_id` as the primary key and every column from Step 1.

- [ ] **Step 4: Commit**

```bash
git add server/db/schema.ts
git commit -m "feat: add machines table for PC management dashboard"
```

---

### Task 2: `POST /api/agents/heartbeat`

**Files:**
- Create: `server/api/agents/heartbeat.post.ts`
- Modify: `server/middleware/auth.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `machines` table from Task 1 (`import { machines } from '../../db/schema'`).
- Produces: route `POST /api/agents/heartbeat`, expects JSON body `{ agentId, hostname, ip?, mac?, os?, osVersion?, arch?, cpuModel?, cpuCores?, cpuUsagePercent?, ramTotalMb?, ramUsedPercent?, diskTotalGb?, diskFreeGb?, loggedInUser?, uptimeSeconds?, networkAdapters?, gateway?, dns?, agentVersion? }`, header `Authorization: Bearer <AGENT_TOKEN>`. Returns `204` on success. This is the exact payload shape the Go agent (Tasks 5-8) must send.

- [ ] **Step 1: Add `AGENT_TOKEN` to the example env**

Append to `.env.example`:

```
AGENT_TOKEN=
```

- [ ] **Step 2: Set a real token in the local `.env`**

Add a line to `.env` (not committed — it's already gitignored like the other secrets in that file):

```
AGENT_TOKEN=dev-local-agent-token
```

- [ ] **Step 3: Create the heartbeat route**

Create `server/api/agents/heartbeat.post.ts`:

```ts
import { db } from '~~/server/index'
import { machines } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const authHeader = event.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token || token !== process.env.AGENT_TOKEN) {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const body = await readBody(event)
  const agentId = body?.agentId
  const hostname = body?.hostname

  if (!agentId || typeof agentId !== 'string') {
    throw createError({ statusCode: 400, message: 'agentId é obrigatório.' })
  }
  if (!hostname || typeof hostname !== 'string') {
    throw createError({ statusCode: 400, message: 'hostname é obrigatório.' })
  }

  const row = {
    agentId,
    hostname,
    ip: body.ip ?? null,
    mac: body.mac ?? null,
    os: body.os ?? null,
    osVersion: body.osVersion ?? null,
    arch: body.arch ?? null,
    cpuModel: body.cpuModel ?? null,
    cpuCores: body.cpuCores ?? null,
    cpuUsagePercent: body.cpuUsagePercent ?? null,
    ramTotalMb: body.ramTotalMb ?? null,
    ramUsedPercent: body.ramUsedPercent ?? null,
    diskTotalGb: body.diskTotalGb ?? null,
    diskFreeGb: body.diskFreeGb ?? null,
    loggedInUser: body.loggedInUser ?? null,
    uptimeSeconds: body.uptimeSeconds ?? null,
    networkAdapters: body.networkAdapters ?? null,
    gateway: body.gateway ?? null,
    dns: body.dns ?? null,
    agentVersion: body.agentVersion ?? null,
    lastSeenAt: new Date(),
  }

  await db
    .insert(machines)
    .values(row)
    .onConflictDoUpdate({ target: machines.agentId, set: row })

  setResponseStatus(event, 204)
})
```

- [ ] **Step 4: Allow-list the route in the auth middleware**

In `server/middleware/auth.ts`, add the heartbeat route to `PUBLIC_ROUTES` (it authenticates itself via the bearer token above, not via session):

```ts
const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/tickets' },
  { method: 'GET', path: '/api/categories' },
  { method: 'GET', path: '/api/graduations' },
  { method: 'GET', path: '/api/sections' },
  { method: 'POST', path: '/api/agents/heartbeat' },
]
```

- [ ] **Step 5: Verify with curl (dev server running via `pnpm dev`)**

Valid token succeeds:

```bash
curl -i -X POST http://localhost:3000/api/agents/heartbeat \
  -H "Authorization: Bearer dev-local-agent-token" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"test-agent-1","hostname":"test-pc","cpuUsagePercent":12.5}'
```

Expected: `HTTP/1.1 204 No Content`.

Invalid token rejected:

```bash
curl -i -X POST http://localhost:3000/api/agents/heartbeat \
  -H "Authorization: Bearer wrong-token" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"test-agent-1","hostname":"test-pc"}'
```

Expected: `HTTP/1.1 401` with body `{"statusCode":401,...,"message":"Token inválido"}`.

Missing hostname rejected:

```bash
curl -i -X POST http://localhost:3000/api/agents/heartbeat \
  -H "Authorization: Bearer dev-local-agent-token" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"test-agent-1"}'
```

Expected: `HTTP/1.1 400` with message `"hostname é obrigatório."`.

Confirm the upsert in the DB:

```bash
docker compose -f docker-compose.dev.yml exec db psql -U postgres -d 7-bib-db -c "select agent_id, hostname, cpu_usage_percent, last_seen_at from machines;"
```

Expected: one row for `test-agent-1` / `test-pc`.

- [ ] **Step 6: Commit**

```bash
git add server/api/agents/heartbeat.post.ts server/middleware/auth.ts .env.example
git commit -m "feat: add agent heartbeat ingestion endpoint"
```

---

### Task 3: `GET /api/machines`

**Files:**
- Create: `server/api/machines.get.ts`

**Interfaces:**
- Consumes: `machines` table from Task 1.
- Produces: route `GET /api/machines`, returns `Array<MachineRow & { online: boolean }>` where `MachineRow` has every column from Task 1's table (camelCase) plus `lastSeenAt` as an ISO string (JSON serialization) and `online` computed as `Date.now() - lastSeenAt < 90_000`. Sorted by `lastSeenAt` descending. This is the exact shape Task 4's dashboard consumes.

- [ ] **Step 1: Create the route**

Create `server/api/machines.get.ts`:

```ts
import { desc } from 'drizzle-orm'
import { db } from '~~/server/index'
import { machines } from '../db/schema'

const ONLINE_THRESHOLD_MS = 90_000

export default defineEventHandler(async () => {
  const rows = await db.select().from(machines).orderBy(desc(machines.lastSeenAt))

  const now = Date.now()
  return rows.map((row) => ({
    ...row,
    online: row.lastSeenAt ? now - new Date(row.lastSeenAt).getTime() < ONLINE_THRESHOLD_MS : false,
  }))
})
```

- [ ] **Step 2: Verify with curl while logged in as admin**

This route is not in `PUBLIC_ROUTES`, so it goes through the normal session + `canAccess` check (admin or infor only). Log into the app in a browser as an admin user, open devtools, copy the `better-auth.session_token` cookie value, then:

```bash
curl -i http://localhost:3000/api/machines \
  -H "Cookie: better-auth.session_token=<paste cookie value>"
```

Expected: `HTTP/1.1 200`, JSON array including the `test-agent-1` row from Task 2 with `"online": true` (since it was just inserted).

Without the cookie:

```bash
curl -i http://localhost:3000/api/machines
```

Expected: `HTTP/1.1 401`.

- [ ] **Step 3: Commit**

```bash
git add server/api/machines.get.ts
git commit -m "feat: add machines listing endpoint"
```

---

### Task 4: Dashboard page

**Files:**
- Create: `app/pages/admin/network.vue`
- Modify: `app/layouts/default.vue:81-106` (the `isAdmin` nav block)

**Interfaces:**
- Consumes: `GET /api/machines` from Task 3, response shape `Array<{ agentId, hostname, ip, mac, os, osVersion, arch, cpuModel, cpuCores, cpuUsagePercent, ramTotalMb, ramUsedPercent, diskTotalGb, diskFreeGb, loggedInUser, uptimeSeconds, networkAdapters, gateway, dns, agentVersion, lastSeenAt, online }>`.

- [ ] **Step 1: Add the nav entry**

In `app/layouts/default.vue`, inside the `isAdmin.value` block (around line 81-106), add a new item alongside the existing "Banco de dados" entry:

```ts
  if (isAdmin.value) {
    items.push({
      label: 'Administração',
      icon: 'i-lucide-settings',
      children:
        state === 'expanded'
          ? [
              {
                label: 'Gerar Relatórios',
                icon: 'i-lucide-chart-line',
                to: '/admin/reports',
              },
              {
                label: 'Gerenciar usuários',
                icon: 'i-lucide-users',
                to: '/admin/users',
              },
              {
                label: 'Banco de dados',
                icon: 'i-lucide-table',
                to: '/admin/database',
              },
              {
                label: 'Rede',
                icon: 'i-lucide-monitor',
                to: '/admin/network',
              },
            ]
          : [],
    });
  }
```

- [ ] **Step 2: Create the dashboard page**

Create `app/pages/admin/network.vue`:

```vue
<script setup lang="ts">
useSeoMeta({
  title: "Rede",
  description: "Visualize os computadores da rede em tempo real.",
});

interface Machine {
  agentId: string;
  hostname: string | null;
  ip: string | null;
  mac: string | null;
  os: string | null;
  osVersion: string | null;
  arch: string | null;
  cpuModel: string | null;
  cpuCores: number | null;
  cpuUsagePercent: number | null;
  ramTotalMb: number | null;
  ramUsedPercent: number | null;
  diskTotalGb: number | null;
  diskFreeGb: number | null;
  loggedInUser: string | null;
  uptimeSeconds: number | null;
  networkAdapters: { name: string; ip: string; mac: string }[] | null;
  gateway: string | null;
  dns: string[] | null;
  agentVersion: string | null;
  lastSeenAt: string;
  online: boolean;
}

const toast = useToast();
const machines = ref<Machine[]>([]);
const loading = ref(true);

async function fetchMachines() {
  loading.value = true;
  try {
    machines.value = await $fetch<Machine[]>("/api/machines");
  } catch {
    toast.add({ title: "Erro ao carregar máquinas.", color: "error" });
  } finally {
    loading.value = false;
  }
}

onMounted(fetchMachines);

const columns = [
  { id: "status", header: "" },
  { id: "hostname", header: "Hostname" },
  { id: "ip", header: "IP" },
  { id: "os", header: "SO" },
  { id: "cpu", header: "CPU" },
  { id: "ram", header: "RAM" },
  { id: "disk", header: "Disco" },
  { id: "loggedInUser", header: "Usuário" },
  { id: "lastSeenAt", header: "Última vez visto" },
];

const detailTarget = ref<Machine | null>(null);
const isDetailOpen = ref(false);

function openDetail(machine: Machine) {
  detailTarget.value = machine;
  isDetailOpen.value = true;
}

function percent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(0)}%`;
}

function gb(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)} GB`;
}

function formatUptime(seconds: number | null) {
  if (seconds === null) return "—";
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Rede</h1>
        <p class="text-sm text-muted mt-1">
          Computadores da rede reportando via agente.
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        variant="ghost"
        color="neutral"
        :loading="loading"
        label="Recarregar"
        @click="fetchMachines"
      />
    </div>

    <UCard :ui="{ body: 'p-0' }">
      <UTable :data="machines" :columns="columns" :loading="loading">
        <template #status-cell="{ row }">
          <span
            class="inline-block w-2 h-2 rounded-full"
            :class="row.original.online ? 'bg-success' : 'bg-error'"
            :title="row.original.online ? 'Online' : 'Offline'"
          />
        </template>

        <template #hostname-cell="{ row }">
          <button
            class="font-medium text-highlighted hover:underline"
            @click="openDetail(row.original)"
          >
            {{ row.original.hostname ?? "—" }}
          </button>
        </template>

        <template #ip-cell="{ row }">
          <span class="text-sm text-muted">{{ row.original.ip ?? "—" }}</span>
        </template>

        <template #os-cell="{ row }">
          <span class="text-sm text-muted"
            >{{ row.original.os ?? "—" }} {{ row.original.osVersion ?? "" }}</span
          >
        </template>

        <template #cpu-cell="{ row }">
          <span class="text-sm">{{ percent(row.original.cpuUsagePercent) }}</span>
        </template>

        <template #ram-cell="{ row }">
          <span class="text-sm">{{ percent(row.original.ramUsedPercent) }}</span>
        </template>

        <template #disk-cell="{ row }">
          <span class="text-sm"
            >{{ gb(row.original.diskFreeGb) }} / {{ gb(row.original.diskTotalGb) }}</span
          >
        </template>

        <template #loggedInUser-cell="{ row }">
          <span class="text-sm">{{ row.original.loggedInUser || "—" }}</span>
        </template>

        <template #lastSeenAt-cell="{ row }">
          <span class="text-sm text-muted">{{
            formatDateTime(row.original.lastSeenAt)
          }}</span>
        </template>
      </UTable>

      <div
        v-if="!loading && machines.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <UIcon name="i-lucide-monitor-off" class="text-4xl text-muted mb-3" />
        <p class="font-medium text-highlighted">Nenhuma máquina reportou ainda</p>
        <p class="text-sm text-muted mt-1">
          Instale o agente em um computador para ele aparecer aqui.
        </p>
      </div>
    </UCard>

    <UModal v-model:open="isDetailOpen" :ui="{ content: 'max-w-lg' }">
      <template #content>
        <UCard v-if="detailTarget">
          <template #header>
            <h2 class="text-lg font-semibold text-highlighted">
              {{ detailTarget.hostname }}
            </h2>
          </template>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <dt class="text-muted">MAC</dt>
            <dd>{{ detailTarget.mac ?? "—" }}</dd>
            <dt class="text-muted">Arquitetura</dt>
            <dd>{{ detailTarget.arch ?? "—" }}</dd>
            <dt class="text-muted">CPU</dt>
            <dd>{{ detailTarget.cpuModel ?? "—" }} ({{ detailTarget.cpuCores ?? "—" }} núcleos)</dd>
            <dt class="text-muted">Uptime</dt>
            <dd>{{ formatUptime(detailTarget.uptimeSeconds) }}</dd>
            <dt class="text-muted">Gateway</dt>
            <dd>{{ detailTarget.gateway ?? "—" }}</dd>
            <dt class="text-muted">DNS</dt>
            <dd>{{ detailTarget.dns?.join(", ") ?? "—" }}</dd>
            <dt class="text-muted">Versão do agente</dt>
            <dd>{{ detailTarget.agentVersion ?? "—" }}</dd>
            <dt class="text-muted">Adaptadores de rede</dt>
            <dd class="col-span-1">
              <div v-for="adapter in detailTarget.networkAdapters ?? []" :key="adapter.name">
                {{ adapter.name }}: {{ adapter.ip }} ({{ adapter.mac }})
              </div>
              <span v-if="!detailTarget.networkAdapters?.length">—</span>
            </dd>
          </dl>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
```

- [ ] **Step 3: Verify in the browser**

Start the dev server (`pnpm dev`), log in as an admin, navigate to `/admin/network`. Confirm the `test-agent-1` row from Task 2 shows up with a green (online) status dot, hostname `test-pc`, CPU `13%` (12.5 rounds to 13). Click the hostname to confirm the detail modal opens. Log in as an `rp` user and confirm `/admin/network` redirects to `/access-denied` (same rule as `/admin/database`). Log in as an `infor` user and confirm the page loads (matches spec: admin + infor visibility).

- [ ] **Step 4: Commit**

```bash
git add app/pages/admin/network.vue app/layouts/default.vue
git commit -m "feat: add network dashboard page"
```

---

### Task 5: Go agent module + config

**Files:**
- Create: `agent/go.mod`
- Create: `agent/internal/config/config.go`
- Test: `agent/internal/config/config_test.go`

**Interfaces:**
- Produces: package `config` with:
  - `type Config struct { ServerURL string; Token string }`
  - `func LoadConfig(path string) (Config, error)` — reads a YAML-ish `key=value` file (server_url, token), one per line.
  - `func LoadOrCreateAgentID(path string) (string, error)` — reads a UUID from `path`; if the file doesn't exist, generates one (`crypto/rand`-backed UUID v4), writes it, and returns it.
  These are consumed by `main.go` in Task 8.

- [ ] **Step 1: Initialize the Go module**

```bash
mkdir -p agent/internal/config
cd agent
go mod init pc-agent
cd ..
```

- [ ] **Step 2: Write the failing test for `LoadOrCreateAgentID`**

Create `agent/internal/config/config_test.go`:

```go
package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadOrCreateAgentID_CreatesOnFirstRun(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "id")

	id, err := LoadOrCreateAgentID(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(id) == 0 {
		t.Fatal("expected non-empty agent id")
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("expected id file to be written: %v", err)
	}
	if string(data) != id {
		t.Fatalf("file content %q does not match returned id %q", data, id)
	}
}

func TestLoadOrCreateAgentID_ReusesExisting(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "id")

	first, err := LoadOrCreateAgentID(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	second, err := LoadOrCreateAgentID(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if first != second {
		t.Fatalf("expected same id across calls, got %q and %q", first, second)
	}
}

func TestLoadConfig_ParsesKeyValueFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config")
	content := "server_url=https://example.internal\ntoken=abc123\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("failed to write fixture: %v", err)
	}

	cfg, err := LoadConfig(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cfg.ServerURL != "https://example.internal" {
		t.Fatalf("expected ServerURL to be parsed, got %q", cfg.ServerURL)
	}
	if cfg.Token != "abc123" {
		t.Fatalf("expected Token to be parsed, got %q", cfg.Token)
	}
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd agent && go test ./internal/config/... -v`
Expected: FAIL — `config.go` doesn't exist yet, build error `undefined: LoadOrCreateAgentID` / `undefined: LoadConfig`.

- [ ] **Step 4: Implement `config.go`**

Create `agent/internal/config/config.go`:

```go
package config

import (
	"crypto/rand"
	"fmt"
	"os"
	"strings"
)

type Config struct {
	ServerURL string
	Token     string
}

func LoadConfig(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("read config file: %w", err)
	}

	cfg := Config{}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		switch key {
		case "server_url":
			cfg.ServerURL = value
		case "token":
			cfg.Token = value
		}
	}

	return cfg, nil
}

func LoadOrCreateAgentID(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err == nil {
		return strings.TrimSpace(string(data)), nil
	}
	if !os.IsNotExist(err) {
		return "", fmt.Errorf("read agent id file: %w", err)
	}

	id, err := newUUID()
	if err != nil {
		return "", fmt.Errorf("generate agent id: %w", err)
	}

	if err := os.WriteFile(path, []byte(id), 0o600); err != nil {
		return "", fmt.Errorf("write agent id file: %w", err)
	}

	return id, nil
}

func newUUID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16]), nil
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd agent && go test ./internal/config/... -v`
Expected: `PASS` for all three tests.

- [ ] **Step 6: Commit**

```bash
git add agent/go.mod agent/internal/config
git commit -m "feat(agent): add config loading and agent id persistence"
```

---

### Task 6: Collector

**Files:**
- Create: `agent/internal/collector/collector.go`
- Test: `agent/internal/collector/collector_test.go`
- Modify: `agent/go.mod` (adds `gopsutil/v3` dependency)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: package `collector` with:
  - `type NetworkAdapter struct { Name, IP, MAC string }`
  - `type Snapshot struct { Hostname, IP, MAC, OS, OSVersion, Arch, CPUModel string; CPUCores int; CPUUsagePercent float64; RAMTotalMB uint64; RAMUsedPercent float64; DiskTotalGB, DiskFreeGB float64; LoggedInUser string; UptimeSeconds uint64; NetworkAdapters []NetworkAdapter; Gateway string; DNS []string }` (`IP`/`MAC` are the primary adapter's, mirrored from the first entry of `NetworkAdapters`)
  - `func Collect() (Snapshot, error)`
  Consumed by `sender` (Task 7, which JSON-marshals it) and `main.go` (Task 8).

- [ ] **Step 1: Add the `gopsutil` dependency**

```bash
cd agent
go get github.com/shirou/gopsutil/v3@latest
cd ..
```

- [ ] **Step 2: Write the failing test**

Create `agent/internal/collector/collector_test.go`:

```go
package collector

import "testing"

func TestCollect_ReturnsPopulatedSnapshot(t *testing.T) {
	snap, err := Collect()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if snap.Hostname == "" {
		t.Error("expected non-empty Hostname")
	}
	if snap.OS == "" {
		t.Error("expected non-empty OS")
	}
	if snap.CPUCores <= 0 {
		t.Errorf("expected positive CPUCores, got %d", snap.CPUCores)
	}
	if snap.RAMTotalMB == 0 {
		t.Error("expected non-zero RAMTotalMB")
	}
	if snap.DiskTotalGB <= 0 {
		t.Errorf("expected positive DiskTotalGB, got %f", snap.DiskTotalGB)
	}
	// LoggedInUser, Gateway, DNS, NetworkAdapters are best-effort:
	// no assertion on their content, just that Collect() didn't fail because of them.
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd agent && go test ./internal/collector/... -v`
Expected: FAIL — `undefined: Collect`.

- [ ] **Step 4: Implement the collector**

Create `agent/internal/collector/collector.go`:

```go
package collector

import (
	"os/exec"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	gnet "github.com/shirou/gopsutil/v3/net"
)

type NetworkAdapter struct {
	Name string
	IP   string
	MAC  string
}

type Snapshot struct {
	Hostname        string
	IP              string
	MAC             string
	OS              string
	OSVersion       string
	Arch            string
	CPUModel        string
	CPUCores        int
	CPUUsagePercent float64
	RAMTotalMB      uint64
	RAMUsedPercent  float64
	DiskTotalGB     float64
	DiskFreeGB      float64
	LoggedInUser    string
	UptimeSeconds   uint64
	NetworkAdapters []NetworkAdapter
	Gateway         string
	DNS             []string
}

func Collect() (Snapshot, error) {
	snap := Snapshot{Arch: runtime.GOARCH}

	if info, err := host.Info(); err == nil {
		snap.Hostname = info.Hostname
		snap.OS = info.OS
		snap.OSVersion = info.PlatformVersion
		snap.UptimeSeconds = info.Uptime
	}

	if cpuInfo, err := cpu.Info(); err == nil && len(cpuInfo) > 0 {
		snap.CPUModel = cpuInfo[0].ModelName
	}
	if cores, err := cpu.Counts(true); err == nil {
		snap.CPUCores = cores
	}
	if percents, err := cpu.Percent(500*time.Millisecond, false); err == nil && len(percents) > 0 {
		snap.CPUUsagePercent = percents[0]
	}

	if vmem, err := mem.VirtualMemory(); err == nil {
		snap.RAMTotalMB = vmem.Total / 1024 / 1024
		snap.RAMUsedPercent = vmem.UsedPercent
	}

	if usage, err := disk.Usage(rootPath()); err == nil {
		snap.DiskTotalGB = float64(usage.Total) / 1024 / 1024 / 1024
		snap.DiskFreeGB = float64(usage.Free) / 1024 / 1024 / 1024
	}

	snap.NetworkAdapters = collectNetworkAdapters()
	if len(snap.NetworkAdapters) > 0 {
		snap.IP = snap.NetworkAdapters[0].IP
		snap.MAC = snap.NetworkAdapters[0].MAC
	}
	snap.LoggedInUser = collectLoggedInUser()
	snap.Gateway, snap.DNS = collectGatewayAndDNS()

	return snap, nil
}

func rootPath() string {
	if runtime.GOOS == "windows" {
		return "C:\\"
	}
	return "/"
}

func collectNetworkAdapters() []NetworkAdapter {
	interfaces, err := gnet.Interfaces()
	if err != nil {
		return nil
	}

	var adapters []NetworkAdapter
	for _, iface := range interfaces {
		if len(iface.Addrs) == 0 || iface.HardwareAddr == "" {
			continue
		}
		if strings.HasPrefix(iface.Addrs[0].Addr, "127.") || strings.Contains(strings.ToLower(iface.Name), "loopback") {
			continue
		}
		adapters = append(adapters, NetworkAdapter{
			Name: iface.Name,
			IP:   iface.Addrs[0].Addr,
			MAC:  iface.HardwareAddr,
		})
	}
	return adapters
}

// collectLoggedInUser is best-effort: shells out to the OS's own "who is
// logged in" command. Returns "" if the command fails or output can't be
// parsed (e.g. no interactive session).
func collectLoggedInUser() string {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("query", "user")
	} else {
		cmd = exec.Command("who")
	}

	out, err := cmd.Output()
	if err != nil {
		return ""
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if runtime.GOOS == "windows" {
		if len(lines) < 2 {
			return ""
		}
		fields := strings.Fields(lines[1])
		if len(fields) == 0 {
			return ""
		}
		return strings.TrimPrefix(fields[0], ">")
	}

	if len(lines) == 0 || lines[0] == "" {
		return ""
	}
	fields := strings.Fields(lines[0])
	if len(fields) == 0 {
		return ""
	}
	return fields[0]
}

var linuxDefaultRoute = regexp.MustCompile(`default via (\S+)`)

// collectGatewayAndDNS is best-effort: returns empty values on any failure
// rather than propagating an error, since portable gateway/DNS lookup is
// unreliable across OSes.
func collectGatewayAndDNS() (string, []string) {
	gateway := ""
	if runtime.GOOS == "windows" {
		if out, err := exec.Command("cmd", "/C", "ipconfig").Output(); err == nil {
			for _, line := range strings.Split(string(out), "\n") {
				if strings.Contains(line, "Default Gateway") {
					parts := strings.Split(line, ":")
					if len(parts) == 2 {
						candidate := strings.TrimSpace(parts[1])
						if candidate != "" {
							gateway = candidate
							break
						}
					}
				}
			}
		}
	} else {
		if out, err := exec.Command("ip", "route").Output(); err == nil {
			if m := linuxDefaultRoute.FindStringSubmatch(string(out)); len(m) == 2 {
				gateway = m[1]
			}
		}
	}

	var dns []string
	if data, err := readResolvConf(); err == nil {
		dns = data
	}

	return gateway, dns
}

func readResolvConf() ([]string, error) {
	if runtime.GOOS == "windows" {
		return nil, nil
	}
	out, err := exec.Command("cat", "/etc/resolv.conf").Output()
	if err != nil {
		return nil, err
	}
	var servers []string
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "nameserver ") {
			servers = append(servers, strings.TrimPrefix(line, "nameserver "))
		}
	}
	return servers, nil
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd agent && go test ./internal/collector/... -v`
Expected: `PASS`. (Run on whatever OS is available; both branches compile on every platform since the OS check is a runtime `if`, not a build tag — only the branch matching the current OS actually executes.)

- [ ] **Step 6: Commit**

```bash
git add agent/go.mod agent/go.sum agent/internal/collector
git commit -m "feat(agent): add cross-platform metrics collector"
```

---

### Task 7: Sender

**Files:**
- Create: `agent/internal/sender/sender.go`
- Test: `agent/internal/sender/sender_test.go`

**Interfaces:**
- Consumes: `collector.Snapshot` and `collector.NetworkAdapter` from Task 6.
- Produces: package `sender` with `func Send(serverURL, token, agentID, agentVersion string, snap collector.Snapshot) error`, which POSTs the JSON payload matching Task 2's expected body (`agentId`, `hostname`, `ip`, `mac`, `os`, `osVersion`, `arch`, `cpuModel`, `cpuCores`, `cpuUsagePercent`, `ramTotalMb`, `ramUsedPercent`, `diskTotalGb`, `diskFreeGb`, `loggedInUser`, `uptimeSeconds`, `networkAdapters`, `gateway`, `dns`, `agentVersion`) to `<serverURL>/api/agents/heartbeat` with header `Authorization: Bearer <token>`. Returns an error on any non-2xx response or transport failure — the caller (Task 8's main loop) is responsible for retry/backoff.

- [ ] **Step 1: Write the failing test**

Create `agent/internal/sender/sender_test.go`:

```go
package sender

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"pc-agent/internal/collector"
)

func TestSend_PostsExpectedPayloadAndAuth(t *testing.T) {
	var gotAuth string
	var gotBody map[string]any

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	snap := collector.Snapshot{
		Hostname:        "test-pc",
		IP:              "10.25.1.2",
		MAC:             "aa:bb",
		OS:              "linux",
		CPUCores:        4,
		CPUUsagePercent: 10.5,
		NetworkAdapters: []collector.NetworkAdapter{{Name: "eth0", IP: "10.25.1.2", MAC: "aa:bb"}},
		DNS:             []string{"8.8.8.8"},
	}

	err := Send(server.URL, "secret-token", "agent-123", "0.1.0", snap)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if gotAuth != "Bearer secret-token" {
		t.Errorf("expected Authorization header, got %q", gotAuth)
	}
	if gotBody["agentId"] != "agent-123" {
		t.Errorf("expected agentId in body, got %v", gotBody["agentId"])
	}
	if gotBody["hostname"] != "test-pc" {
		t.Errorf("expected hostname in body, got %v", gotBody["hostname"])
	}
	if gotBody["ip"] != "10.25.1.2" {
		t.Errorf("expected ip in body, got %v", gotBody["ip"])
	}
	if gotBody["agentVersion"] != "0.1.0" {
		t.Errorf("expected agentVersion in body, got %v", gotBody["agentVersion"])
	}
}

func TestSend_ReturnsErrorOnNon2xx(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	err := Send(server.URL, "wrong-token", "agent-123", "0.1.0", collector.Snapshot{Hostname: "x"})
	if err == nil {
		t.Fatal("expected error on 401 response, got nil")
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd agent && go test ./internal/sender/... -v`
Expected: FAIL — `undefined: Send`.

- [ ] **Step 3: Implement the sender**

Create `agent/internal/sender/sender.go`:

```go
package sender

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"pc-agent/internal/collector"
)

type payload struct {
	AgentID         string                     `json:"agentId"`
	Hostname        string                     `json:"hostname"`
	IP              string                     `json:"ip"`
	MAC             string                     `json:"mac"`
	OS              string                     `json:"os"`
	OSVersion       string                     `json:"osVersion"`
	Arch            string                     `json:"arch"`
	CPUModel        string                     `json:"cpuModel"`
	CPUCores        int                        `json:"cpuCores"`
	CPUUsagePercent float64                    `json:"cpuUsagePercent"`
	RAMTotalMB      uint64                     `json:"ramTotalMb"`
	RAMUsedPercent  float64                    `json:"ramUsedPercent"`
	DiskTotalGB     float64                    `json:"diskTotalGb"`
	DiskFreeGB      float64                    `json:"diskFreeGb"`
	LoggedInUser    string                     `json:"loggedInUser"`
	UptimeSeconds   uint64                     `json:"uptimeSeconds"`
	NetworkAdapters []collector.NetworkAdapter `json:"networkAdapters"`
	Gateway         string                     `json:"gateway"`
	DNS             []string                   `json:"dns"`
	AgentVersion    string                     `json:"agentVersion"`
}

var httpClient = &http.Client{Timeout: 10 * time.Second}

func Send(serverURL, token, agentID, agentVersion string, snap collector.Snapshot) error {
	body := payload{
		AgentID:         agentID,
		Hostname:        snap.Hostname,
		IP:              snap.IP,
		MAC:             snap.MAC,
		OS:              snap.OS,
		OSVersion:       snap.OSVersion,
		Arch:            snap.Arch,
		CPUModel:        snap.CPUModel,
		CPUCores:        snap.CPUCores,
		CPUUsagePercent: snap.CPUUsagePercent,
		RAMTotalMB:      snap.RAMTotalMB,
		RAMUsedPercent:  snap.RAMUsedPercent,
		DiskTotalGB:     snap.DiskTotalGB,
		DiskFreeGB:      snap.DiskFreeGB,
		LoggedInUser:    snap.LoggedInUser,
		UptimeSeconds:   snap.UptimeSeconds,
		NetworkAdapters: snap.NetworkAdapters,
		Gateway:         snap.Gateway,
		DNS:             snap.DNS,
		AgentVersion:    agentVersion,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, serverURL+"/api/agents/heartbeat", bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send heartbeat: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("heartbeat rejected with status %d", resp.StatusCode)
	}

	return nil
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd agent && go test ./internal/sender/... -v`
Expected: `PASS` for both tests.

- [ ] **Step 5: Commit**

```bash
git add agent/internal/sender
git commit -m "feat(agent): add heartbeat sender"
```

---

### Task 8: Main loop, service wrapper, and install docs

**Files:**
- Create: `agent/main.go`
- Create: `agent/README.md`
- Modify: `agent/go.mod` (adds `kardianos/service` dependency)

**Interfaces:**
- Consumes: `config.LoadConfig`, `config.LoadOrCreateAgentID` (Task 5), `collector.Collect` (Task 6), `sender.Send` (Task 7).
- Produces: the `pc-agent` binary — no further tasks depend on this one; it's the final integration point.

- [ ] **Step 1: Add the `kardianos/service` dependency**

```bash
cd agent
go get github.com/kardianos/service@latest
cd ..
```

- [ ] **Step 2: Write `main.go`**

Create `agent/main.go`:

```go
package main

import (
	"log"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/kardianos/service"

	"pc-agent/internal/collector"
	"pc-agent/internal/config"
	"pc-agent/internal/sender"
)

const agentVersion = "0.1.0"
const heartbeatInterval = 30 * time.Second

type program struct {
	stop chan struct{}
}

func (p *program) Start(s service.Service) error {
	p.stop = make(chan struct{})
	go p.run()
	return nil
}

func (p *program) Stop(s service.Service) error {
	close(p.stop)
	return nil
}

func (p *program) run() {
	dataDir := defaultDataDir()
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		log.Printf("failed to create data dir %s: %v", dataDir, err)
		return
	}

	agentID, err := config.LoadOrCreateAgentID(filepath.Join(dataDir, "id"))
	if err != nil {
		log.Printf("failed to load agent id: %v", err)
		return
	}

	cfg, err := config.LoadConfig(filepath.Join(dataDir, "config"))
	if err != nil {
		log.Printf("failed to load config: %v", err)
		return
	}

	ticker := time.NewTicker(heartbeatInterval)
	defer ticker.Stop()

	p.sendOnce(cfg, agentID)

	for {
		select {
		case <-p.stop:
			return
		case <-ticker.C:
			p.sendOnce(cfg, agentID)
		}
	}
}

func (p *program) sendOnce(cfg config.Config, agentID string) {
	snap, err := collector.Collect()
	if err != nil {
		log.Printf("collect failed: %v", err)
		return
	}

	backoff := time.Second
	for attempt := 0; attempt < 3; attempt++ {
		err := sender.Send(cfg.ServerURL, cfg.Token, agentID, agentVersion, snap)
		if err == nil {
			return
		}
		log.Printf("heartbeat attempt %d failed: %v", attempt+1, err)
		time.Sleep(backoff)
		backoff *= 2
	}
}

func defaultDataDir() string {
	if runtime.GOOS == "windows" {
		return `C:\ProgramData\pc-agent`
	}
	return "/etc/pc-agent"
}

func main() {
	svcConfig := &service.Config{
		Name:        "pc-agent",
		DisplayName: "PC Management Agent",
		Description: "Reports machine info to the 7-bib-apps management dashboard.",
	}

	prg := &program{}
	s, err := service.New(prg, svcConfig)
	if err != nil {
		log.Fatal(err)
	}

	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "install":
			if err := s.Install(); err != nil {
				log.Fatal(err)
			}
			log.Println("service installed")
			return
		case "uninstall":
			if err := s.Uninstall(); err != nil {
				log.Fatal(err)
			}
			log.Println("service uninstalled")
			return
		case "start":
			if err := s.Start(); err != nil {
				log.Fatal(err)
			}
			log.Println("service started")
			return
		case "stop":
			if err := s.Stop(); err != nil {
				log.Fatal(err)
			}
			log.Println("service stopped")
			return
		}
	}

	if err := s.Run(); err != nil {
		log.Fatal(err)
	}
}
```

- [ ] **Step 3: Build for both platforms**

```bash
cd agent
GOOS=linux GOARCH=amd64 go build -o dist/pc-agent-linux-amd64 .
GOOS=windows GOARCH=amd64 go build -o dist/pc-agent-windows-amd64.exe .
cd ..
```

Expected: both builds succeed with no errors, producing the two binaries under `agent/dist/`.

- [ ] **Step 4: Manual smoke test (Linux, or whichever OS is available)**

```bash
mkdir -p /tmp/pc-agent-test
cat > /tmp/pc-agent-test/config <<'EOF'
server_url=http://localhost:3000
token=dev-local-agent-token
EOF
```

Run the agent directly in the foreground (bypass the service manager for this manual check) by temporarily pointing `defaultDataDir` at `/tmp/pc-agent-test` — simplest way: run from that directory after copying the binary there and editing `defaultDataDir`'s non-Windows branch to `return "."` for this one test, or symlink `/etc/pc-agent` to `/tmp/pc-agent-test` if you have permission:

```bash
sudo mkdir -p /etc/pc-agent
sudo cp /tmp/pc-agent-test/config /etc/pc-agent/config
sudo ./agent/dist/pc-agent-linux-amd64
```

Let it run for ~35 seconds, then Ctrl+C. Confirm a row appeared:

```bash
docker compose -f docker-compose.dev.yml exec db psql -U postgres -d 7-bib-db -c "select agent_id, hostname, os, cpu_usage_percent, ram_used_percent, logged_in_user, last_seen_at from machines order by last_seen_at desc limit 5;"
```

Expected: a row with your machine's real hostname, OS, live CPU/RAM percentages, and (if you're at a graphical/terminal login) your logged-in username. Refresh `/admin/network` in the browser and confirm it appears with a green status dot.

- [ ] **Step 5: Write the install README**

Create `agent/README.md`:

```markdown
# pc-agent

Reports machine info (hardware, OS, logged-in user, network) to the
7-bib-apps management dashboard every 30 seconds.

## Build

    GOOS=linux GOARCH=amd64 go build -o dist/pc-agent-linux-amd64 .
    GOOS=windows GOARCH=amd64 go build -o dist/pc-agent-windows-amd64.exe .

## Install

1. Copy the binary for the target OS to the machine.
2. Create the config file:
   - Linux: `/etc/pc-agent/config`
   - Windows: `C:\ProgramData\pc-agent\config`

   With contents:

       server_url=https://<your-server>
       token=<AGENT_TOKEN value from the server's .env>

3. Install and start the service:
   - Linux: `sudo ./pc-agent-linux-amd64 install && sudo ./pc-agent-linux-amd64 start`
   - Windows (as Administrator): `pc-agent-windows-amd64.exe install` then `pc-agent-windows-amd64.exe start`

The agent generates and persists its own unique ID on first run (next to
the config file) — this is what identifies the machine in the dashboard,
independent of hostname.

## Uninstall

    <binary> stop
    <binary> uninstall
```

- [ ] **Step 6: Commit**

```bash
git add agent/main.go agent/go.mod agent/go.sum agent/README.md
git commit -m "feat(agent): wire up main loop, service install, and docs"
```

---

## Post-implementation

After Task 8, the dashboard sub-project is complete and independently useful: any PC running the agent shows up in `/admin/network` within 30 seconds. Remote access (RustDesk) is a separate future sub-project, out of scope here per the spec.
