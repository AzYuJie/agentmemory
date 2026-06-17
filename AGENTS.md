# agentmemory — Agent Instructions

## Architecture

agentmemory is a persistent memory system for AI coding agents, built on iii-engine's three primitives (Worker/Function/Trigger). Everything goes through `registerFunction`/`registerTrigger`/`sdk.trigger()` — never bypass iii-engine with standalone SQLite or in-process alternatives.

- **Engine**: iii-sdk (WebSocket to iii-engine on port 49134)
- **State**: File-based SQLite via iii-engine's StateModule (`./data/state_store.db`)
- **Build**: TypeScript → ESM via tsdown, output to `dist/`
- **Test**: vitest (`npm test` excludes integration tests)

## Consistency Rules

**When adding or removing MCP tools, you MUST update ALL of the following:**
1. `src/mcp/tools-registry.ts` — tool definition + `getAllTools()` array
2. `src/mcp/server.ts` — handler case in the `mcp::tools::call` switch
3. `src/triggers/api.ts` — REST endpoint registration
4. `src/index.ts` — function registration + endpoint count in the log line
5. `test/mcp-standalone.test.ts` — tool count assertion
6. `README.md` — tool counts (search for "MCP tools")
7. `plugin/.claude-plugin/plugin.json` — tool count in description
8. `plugin/plugin.json` and `plugin/.mcp.copilot.json` (when present) — tool count or MCP exposure

**When adding REST endpoints, you MUST update:**
1. `src/triggers/api.ts` — endpoint registration
2. `src/index.ts` — endpoint count in the log line
3. `README.md` — endpoint count (search for "REST endpoints" and "endpoints on port")

**When bumping version, you MUST update ALL of the following:**
1. `package.json` — version field
2. `src/version.ts` — VERSION constant and type union
3. `src/types.ts` — ExportData version union
4. `src/functions/export-import.ts` — supportedVersions set
5. `test/export-import.test.ts` — version assertion
6. `plugin/.claude-plugin/plugin.json` — version field
7. `plugin/plugin.json` (when present) — version field

**When adding new KV scopes:**
1. `src/state/schema.ts` — add to the KV object
2. `src/types.ts` — add the corresponding interface

**When adding new audit operations:**
1. `src/types.ts` — add to AuditEntry.operation union type

## Code Patterns

### Function Registration
```typescript
sdk.registerFunction(
  "mem::your-function",
  async (data: { ... }) => {
    // validate inputs
    // do work via kv.get/kv.set/kv.list
    // record audit via recordAudit()
    return { success: true, ... };
  },
);
```

### REST Endpoint Registration
```typescript
sdk.registerFunction("api::your-endpoint", async (req: ApiRequest) => {
  const denied = checkAuth(req, secret);
  if (denied) return denied;
  const body = req.body as Record<string, unknown>;
  // validate + whitelist fields (never pass raw body to sdk.trigger)
  const result = await sdk.trigger({
    function_id: "mem::your-function",
    payload: { ... },
  });
  return { status_code: 200, body: result };
});
sdk.registerTrigger({
  type: "http",
  function_id: "api::your-endpoint",
  config: { api_path: "/agentmemory/your-path", http_method: "POST" },
});
```

### MCP Tool Handler
```typescript
case "memory_your_tool": {
  // validate args with typeof checks
  // parse CSV args: args.field.split(",").map(t => t.trim()).filter(Boolean)
  const result = await sdk.trigger({
    function_id: "mem::your-function",
    payload: { ... },
  });
  return { status_code: 200, body: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } };
}
```

### Hook Scripts
Hook scripts in `src/hooks/` are standalone Node.js scripts (no iii-sdk import). They read JSON from stdin, make HTTP calls to the REST API, and exit. There are two patterns depending on whether Claude Code consumes the script's stdout:

- **Context-injecting hooks** (`pre-tool-use`, `pre-compact`, `session-start`) write recalled context to stdout for Claude Code to inject. These MUST use `try/catch` with `await fetch(..., { signal: AbortSignal.timeout(N) })` — the script has to wait for the response before exiting, and the timeout is the only bound on hang time.
- **Telemetry-only hooks** (`notification`, `post-tool-failure`, `post-tool-use`, `prompt-submit`, `stop`, `session-end`, `subagent-start`, `subagent-stop`, `task-completed`) write nothing to stdout. These MUST use fire-and-forget `fetch(..., { signal: AbortSignal.timeout(N) }).catch(() => {})` paired with `setTimeout(() => process.exit(0), 500).unref()`. The unawaited fetch dispatches the request; the unref'd `setTimeout` force-exits the process after the request has been flushed to the local daemon's socket buffer (~500ms is enough for single-request hooks; use 1500ms for multi-request hooks like `stop` and `session-end` so all fetches have time to start, especially when `AGENTMEMORY_URL` points to a remote daemon). Without the `setTimeout` Node keeps the event loop alive waiting for any in-flight fetch to settle, which means the hook still blocks Claude Code's next-prompt boundary for up to the AbortSignal duration — exactly the bug fire-and-forget is meant to fix.

## Coding Standards

- TypeScript, ESM only (`"type": "module"`)
- No code comments explaining WHAT — use clear naming instead
- Use `fingerprintId()` for content-addressable dedup, `generateId()` for unique IDs
- Parallel operations where possible (`Promise.all` for independent kv writes/reads)
- Input validation at system boundaries (MCP handlers, REST endpoints)
- REST endpoints must whitelist fields — never pass raw request body to `sdk.trigger()`
- Use `recordAudit()` for state-changing operations
- Timestamps: capture once with `new Date().toISOString()` and reuse

## Testing

- All tests must pass before PR: `npm test` (950+ tests)
- Mock pattern: `vi.mock("iii-sdk")` with mock `sdk.trigger`, `kv.get/set/list`
- Test files go in `test/` with `.test.ts` extension
- Follow existing patterns in `test/crystallize.test.ts` for function tests

## Local Deployment Ops (fork maintenance)

This repo is maintained as a local fork (upstream: rohitg00/agentmemory, fork: AzYuJie/agentmemory) and rebuilt/redeployed frequently. The hazards below are specific to that workflow.

### Mandatory deploy sequence — `am-redeploy.sh`

**Never `pkill` / `agentmemory stop` alone.** macOS launchd keeps agentmemory alive via `~/Library/LaunchAgents/com.aizen.agentmemory.plist` (`KeepAlive=true`, `ThrottleInterval=10`). A bare `pkill` causes launchd to respawn a fresh worker within 10s; if a build/redeploy is mid-flight, multiple workers fight over the same iii-engine → routes register to a stale worker → `GET /agentmemory/livez` returns 404 → the dashboard appears "broken" and is easily misread as data loss.

Use the pinned helper instead:
```bash
~/.agentmemory/bin/am-redeploy.sh           # build + npm link + restart
~/.agentmemory/bin/am-redeploy.sh --no-build # restart only
```
The script enforces the only correct order: **launchctl unload → stop + pkill residue → wait for port 3111 free → build/link → launchctl load → wait for health → verify data integrity (slots chars + session count before vs after)**. If integrity regresses it prints the snapshot-restore command.

### "API unreachable" ≠ "data loss"

Before concluding data is gone, check the physical store:
```bash
ls -la ~/.agentmemory/data/state_store.db/   # bin file mtimes tell you if a scope was overwritten
```
The viewer returning a blank page or `livez` 404 almost always means a worker/routing race, not corruption. Resolve with `am-redeploy.sh --no-build` first.

## Data Safety (fork-local fixes)

Several upstream bugs silently destroy data on restart; the fixes below are load-bearing for local maintenance and must not be regressed.

### `seedDefaults` must use `kv.list`, never `kv.get`
`src/functions/slots.ts::seedDefaults` runs on every boot to seed default slots. The upstream version checked existence with `kv.get` — but iii-engine's `kv.get` is unreliable during early startup (state store not fully ready, returns null for existing keys). The result: every restart re-seeded slots with empty templates, **wiping user content**. Fix: build a label set from `kv.list(KV.slots)` + `kv.list(KV.globalSlots)` and skip any label already present. If `kv.list` itself throws, skip the whole seed (outer `.catch`) rather than overwrite.

### `session/start` is idempotent via `kv.list`
`src/triggers/api.ts::api::session::start` must NOT reset `observationCount` / `startedAt` / `status` when the session already exists (used for project-identifier migration). Implementation looks up the existing session through `kv.list(KV.sessions).find(s => s.id === sessionId)` and merges only `project` / `cwd` / `updatedAt`. Do not switch this back to `kv.get` — same early-startup null bug.

### Project identifier = `basename(cwd)`
`src/hooks/_project.ts::resolveProject` returns `AGENTMEMORY_PROJECT_NAME` env or `basename(cwd)` — **no git toplevel resolution**. The Pi extension (`~/.pi/agent/extensions/agentmemory/index.ts`) sets `currentProject = path.basename(cwd)` while keeping the full path in a separate `currentCwd`. Do not reintroduce `git rev-parse --show-toplevel`; project IDs must be plain folder names.

### Data dir lives outside the repo
`iii-config.yaml` points the state store at absolute paths under `~/.agentmemory/data/` (not `./data/`). This survives `git clean -fdx` and repo re-clones. Keep these paths absolute.

### Snapshots cover all 15 scopes
`src/functions/snapshot.ts::mem::snapshot-create` / `mem::snapshot-restore` export and re-import: sessions, memories, graphNodes, observations, accessLogs, **slots, globalSlots, lessons, actions, crystals, audit, insights, signals, checkpoints, sentinels, sketches, routines**. When adding a new KV scope that holds user data, add it to both create and restore (and to `SnapshotMeta.stats`). Sessions are filtered to drop entries missing `id` before serializing, so a single corrupt row can no longer poison the snapshot.

## iii-engine Pitfalls

- **`kv.get` is unreliable at boot.** During early startup it can return null for keys that exist. For any existence check that gates an overwrite (seed defaults, idempotent upserts), prefer `kv.list` + in-memory lookup. Request-time reads inside an already-warm handler are fine.
- **Multiple workers corrupt routing.** One iii-engine + N agentmemory workers = the HTTP routes may bind to whichever worker registered last, breaking `livez`/health. Always ensure exactly one worker (see `am-redeploy.sh`).
- **SIGKILL before flush can drop KV writes.** Prefer `agentmemory stop` (graceful) over `kill -9`; reserve `kill -9` for unresponsive residue after `stop`, and always pair it with `am-redeploy.sh`'s port-wait gate.

## Current Stats (v0.9.16)

- 53 MCP tools (8 visible by default, `AGENTMEMORY_TOOLS=all` for all)
- 128 REST endpoints
- 6 MCP resources, 3 MCP prompts
- 12 hooks, 15 skills
- 50+ iii functions
- 950+ tests
