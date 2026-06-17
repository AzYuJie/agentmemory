# Design: Slots 查看页 + project 参数

## 1. Viewer Slots 页

复用现有 viewer 的 tab/view 模式：

- Tab 按钮: `<button data-tab="slots">Slots</button>`
- View 容器: `<div id="view-slots" class="view"></div>`
- TAB_IDS 数组添加 `'slots'`
- state 对象添加 `slots: { loaded: false }`
- loadTab 添加 `case 'slots'` 分支
- 新增 `loadSlots()` 函数：
  - 调用 `apiGet('slots')` 获取 slot 列表（已有 REST endpoint: GET /agentmemory/slots）
  - 以卡片形式渲染每个 slot：label、scope、内容预览
  - 点击可展开查看完整内容

## 2. MCP project 参数

后端的 `mem::search` 和 `mem::smart-search` 已支持 `project` 参数做精确过滤，只需在 MCP 层暴露：

### tools-registry.ts
- `memory_recall`: inputSchema.properties 增加 `project: { type: "string", description: "按项目标识符过滤（精确匹配）" }`
- `memory_smart_search`: inputSchema.properties 增加 `project: { type: "string", description: "按项目标识符过滤" }`

### server.ts
- `memory_recall` handler: payload 增加 `project: args.project`
- `memory_smart_search` handler: payload 增加 `project: args.project`

## 3. 变更文件清单

| 文件 | 变更 |
|------|------|
| `src/viewer/index.html` | 新增 Slots tab/view/loadSlots |
| `src/mcp/tools-registry.ts` | memory_recall, memory_smart_search 增加 project 属性 |
| `src/mcp/server.ts` | 两个 handler 传递 project 参数 |
