# Code Conventions

## TypeScript

- Strict mode. No `any` without justification.
- ESM only. Import with `.js` extension (e.g., `import { KV } from "../state/schema.js"`).
- No code comments explaining WHAT the code does — only write comments when the *why* is non-obvious (hidden constraint, invariant, workaround).

## Function registration pattern

Every function lives in `src/functions/<area>.ts` and exports a single `registerXxxFunction(sdk: ISdk, kv: StateKV): void`:
```typescript
sdk.registerFunction("mem::function-name", async (data: { ... }) => {
  // validate inputs at boundary
  // do work via kv.get/kv.set/kv.list
  // recordAudit() for state-changing ops
  return { success: true, ... };
});
```

## REST endpoint pattern

```typescript
sdk.registerFunction("api::endpoint-name", async (req: ApiRequest) => {
  const denied = checkAuth(req, secret);
  if (denied) return denied;
  const body = req.body as Record<string, unknown>;
  // whitelist fields — never pass raw body to sdk.trigger()
  const result = await sdk.trigger({ function_id: "mem::...", payload: { ... } });
  return { status_code: 200, body: result };
});
```

## MCP tool addition checklist

1. Register in `src/functions/<area>.ts`
2. HTTP trigger in `src/triggers/api.ts`
3. Tool entry in `src/mcp/tools-registry.ts`
4. Handler case in `src/mcp/server.ts`
5. Write test in `test/`
6. Update counts: README, plugin.json, mcp-standalone.test.ts

## Naming

- camelCase for variables/functions
- UPPER_SNAKE_CASE for constants
- Function IDs: `mem::` or `api::` prefix
- Test files: `test/<behavior>.test.ts`

## State

- KV scopes defined in `src/state/schema.ts` KV object + matching interface in `src/types.ts`
- Timestamps: capture once with `new Date().toISOString()`, reuse
- Audit: `recordAudit()` for all state-changing operations
- IDs: `fingerprintId()` for content-addressable dedup, `generateId()` for unique IDs

## Hooks

- Standalone Node scripts in `src/hooks/`, built to `dist/hooks/` and `plugin/scripts/`
- No iii-sdk imports — they read JSON from stdin, make HTTP calls to REST API
- Context-injecting hooks use `try/catch` with `AbortSignal.timeout()`
- Telemetry-only hooks use fire-and-forget `fetch()` + `setTimeout(() => process.exit(0), N).unref()`
