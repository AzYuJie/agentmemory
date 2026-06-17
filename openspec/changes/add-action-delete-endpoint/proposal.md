# Proposal: 增加 Action 删除接口和 MCP 工具

## 动机

当前 agentmemory 缺少删除 action 的能力，测试任务只能标记为 cancelled 但无法从列表中移除。需要增加 REST API 和 MCP 工具支持删除 action。

## 目标

1. 新增 `mem::action-delete` 函数，支持物理删除 action 及其关联 edges
2. 新增 REST 端点 `DELETE /agentmemory/actions`
3. 新增 MCP 工具 `memory_action_delete`

## 范围

仅新增删除能力，不改变现有接口和数据结构。
