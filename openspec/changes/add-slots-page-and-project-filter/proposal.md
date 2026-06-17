# Proposal: 新增 Slots 查看页 + 为查询类工具增加 project 参数

## 动机

1. viewer 当前缺少 Memory Slots 的展示页面，用户无法直观查看已配置的 slots 内容
2. memory_recall / memory_smart_search 等查询工具的 MCP 接口缺少 `project` 可选参数，而其后端函数已支持 project 过滤，但不便跨项目隔离查询

## 目标

1. 在 viewer 中新增 "Slots" 标签页，展示所有已配置的 memory slots 及其内容
2. 为 `memory_recall`、`memory_smart_search` MCP 工具增加可选 `project` 参数

## 范围

- **viewer**: 新增一个 tab + view div + loadSlots 渲染函数
- **MCP tools registry**: 为 memory_recall、memory_smart_search 的 inputSchema 增加 project 属性
- **MCP server**: 将 project 参数透传到对应后端函数
