# Proposal: 修复任务界面无法加载（tags 类型错误）

## 问题描述

访问 agentmemory Dashboard 的 Actions（任务）标签页时，页面崩溃无法渲染。浏览器控制台报错：

```
(索引):3420 Uncaught (in promise) TypeError: (a.tags || []).map is not a function
    at renderActions ((索引):3411:15)
    at loadActions ((索引):3369:7)
```

## 根因分析

**直接原因**：`src/viewer/index.html` 第 3420 行和 3380 行对 `a.tags` 使用了 `(a.tags || []).map()` 模式。当 `a.tags` 是一个非数组的真值（如字符串 `"tag1,tag2"`）时，`||` 短路不触发，对字符串调用 `.map()` 导致 TypeError。

**数据来源**：后端 `mem::action-create`（`src/functions/actions.ts`）中 `tags: data.tags || []` 未对字符串类型的 tags 做归一化处理。如果 REST API 请求体传入的 `tags` 是逗号分隔的字符串而非数组，tags 会被原样存储为字符串。

**触发路径**：
1. 用户通过 REST API（`POST /agentmemory/actions`）创建 action，`tags` 字段为字符串
2. 后端 `mem::action-create` 直接将字符串存入 KV 存储
3. Dashboard 加载 actions 列表时，`renderActions()` 对字符串调用 `.map()` 崩溃

**注意**：MCP 工具 `memory_action_create` 在 `src/mcp/server.ts` 中已经做了 `tags.split(",")` 转换，不会产生此问题。但 REST API 端未做相同处理。

## 修复目标

1. 前端防御性修复：确保 tags 为非数组时降级为空数组，阻止页面崩溃
2. 后端归一化修复：`mem::action-create` 中将字符串 tags 转换为数组
