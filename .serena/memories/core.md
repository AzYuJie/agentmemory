# agentmemory — Core Architecture

Persistent memory system for AI coding agents. Built on iii-engine's three primitives (Worker/Function/Trigger).

## Architecture invariants

- Everything goes through `sdk.registerFunction` / `sdk.registerTrigger` / `sdk.trigger()` — never bypass iii-engine with standalone SQLite or in-process alternatives.
- State is file-based SQLite via iii-engine's StateModule (`./data/state_store.db`). StateKV layer wraps it.
- iii-engine pins to v0.11.2 (not yet refactored for v0.11.6 sandbox model).

## Source layout

| Directory | Purpose |
|-|-|
| `src/index.ts` | Entry point. Registers all functions with iii-sdk worker. |
| `src/functions/` | Core memory operations — observe, compress, consolidate, retention, search, graph, governance, etc. Each file exports a single `registerXxxFunction(sdk, kv)` |
| `src/state/` | KV schema (`schema.ts`), StateKV wrapper (`kv.ts`), keyed-mutex, search-index, vector-index, hybrid-search, CJK segmenter, reranker |
| `src/mcp/` | Standalone MCP server, tools registry, transport, in-memory KV, REST proxy |
| `src/hooks/` | 12 auto-hooks that capture agent sessions (session-start, pre-tool-use, post-tool-use, stop, etc.) |
| `src/triggers/` | HTTP endpoint registration (`api.ts`) + event triggers |
| `src/providers/` | LLM + embedding providers: Anthropic, OpenAI, Gemini, OpenRouter, MiniMax; embedding: Cohere, Voyage, CLIP, local (Xenova). Fallback chain + circuit breaker. |
| `src/cli/` | CLI entry (`cli.ts`), onboarding, doctor, connect (agent integrations), splash |
| `src/viewer/` | Real-time memory viewer (HTML server + document model) |
| `src/prompts/` | LLM prompt templates (reflect, consolidation, compression, vision, graph-extraction, summary, XML) |
| `src/telemetry/` | Telemetry setup |
| `src/eval/` | Quality evaluation, metrics store, self-correct, validator |
| `src/replay/` | JSONL replay parser + timeline |
| `test/` | Vitest suite (1423+ tests). Tests named after behavior, not implementation. |
| `plugin/` | Claude Code plugin descriptor + hook scripts |
| `integrations/` | First-party plugins: hermes, openclaw, filesystem-watcher |
| `website/` | Marketing site (Next.js 16) |

## Consistency rules

When adding/removing MCP tools, update ALL: `tools-registry.ts`, `server.ts` handler, `api.ts` endpoint, `index.ts` registration, `mcp-standalone.test.ts` count assertion, README counts, plugin.json counts.

When bumping version, update ALL: `package.json`, `src/version.ts`, `src/types.ts` ExportData union, `export-import.ts` supportedVersions, `export-import.test.ts` assertion, `plugin/.claude-plugin/plugin.json`.

When adding new KV scopes: `schema.ts` KV object + `types.ts` interface.

When adding audit operations: `types.ts` AuditEntry.operation union.

## Further memories

- Tech stack details: `mem:tech_stack`
- Commands to run: `mem:suggested_commands`
- Code conventions: `mem:conventions`
- Task completion checklist: `mem:task_completion`
