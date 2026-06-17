# Design: 修复 tags 类型错误

## 修复方案

双重修复（前端防御 + 后端归一化），确保数据流两端都正确处理 tags 字段。

### 1. 前端修复（`src/viewer/index.html`）

在两处使用 `a.tags` 的位置添加 `Array.isArray()` 检查，确保非数组值降级为空数组。

**位置 A — 第 3380 行（搜索过滤）**：
```javascript
// 修改前
(a.tags || []).join(' ')
// 修改后
(Array.isArray(a.tags) ? a.tags : []).join(' ')
```

**位置 B — 第 3420 行（表格渲染）**：
```javascript
// 修改前
(a.tags || []).map(esc).join(', ')
// 修改后
(Array.isArray(a.tags) ? a.tags : []).map(esc).join(', ')
```

### 2. 后端修复（`src/functions/actions.ts`）

在 `mem::action-create` 中，对 `data.tags` 做归一化处理：若为字符串则按逗号分割为数组。

```typescript
// 修改前
tags: data.tags || [],
// 修改后
tags: Array.isArray(data.tags)
  ? data.tags
  : typeof data.tags === "string"
    ? data.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
    : [],
```

## 影响范围

- 前端：仅 actions 表格渲染和搜索过滤逻辑，不影响其他模块
- 后端：仅 action 创建入口，不改变 Action 类型定义和下游消费方

## 风险

- 低风险。修复为纯防御性/归一化逻辑，不改变正常路径行为
