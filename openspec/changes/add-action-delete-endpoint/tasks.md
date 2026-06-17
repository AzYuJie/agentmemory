# Tasks: 增加 Action 删除接口和 MCP 工具

- [x] 新增 `mem::action-delete` 函数（`src/functions/actions.ts`）
- [x] 新增 REST 端点 `api::action-delete`（`src/triggers/api.ts`）
- [x] 新增 MCP 工具 `memory_action_delete`（`src/mcp/server.ts` + `tools-registry.ts`）
- [x] 更新计数：`src/index.ts`、`test/tool-count-consistency.test.ts`、`README.md`、plugin/*.json、skills REFERENCE
- [x] 运行 `npm test` 确认全部通过（1399 pass，仅 2 预存 openai-shared 失败）
