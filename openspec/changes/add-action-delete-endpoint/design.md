# Design: Action 删除实现

## 实现说明

在 `src/functions/actions.ts` 新增 `mem::action-delete`，删除 action 记录及其关联的所有 edges，记录审计日志。

## 涉及文件

| 文件 | 变更 |
|------|------|
| `src/functions/actions.ts` | 新增 `mem::action-delete` |
| `src/triggers/api.ts` | 新增 `api::action-delete` + trigger |
| `src/mcp/server.ts` | 新增 `memory_action_delete` handler |
| `src/mcp/tools-registry.ts` | 新增工具定义 |
| `src/index.ts` | 注册新 function，更新计数 |
| `test/mcp-standalone.test.ts` | 更新工具数断言 |
| `README.md` | 更新工具/端点计数 |

## 删除逻辑

```
输入: actionId
1. 校验 actionId 非空
2. kv.get 查找 action，不存在返回 404
3. 并发删除所有关联 edges（kv.list + filter + 逐个 del）
4. 删除 action 本身
5. 记录 audit
6. 返回 { success: true }
```
