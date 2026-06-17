# Design: viewer-detail-modal-and-tab-reorder

## 1. Tab 重排序

在 tab-bar HTML 和 TAB_IDS 数组中，将 "slots" 从第2位移到 "graph" 之后（第3位）。

调整后顺序：Dashboard → Graph → Slots → Memories → Timeline → Sessions → Lessons → Actions → Crystals → Audit → Activity → Profile → Replay

## 2. 详情弹窗

复用已有 modal overlay (`#modal-overlay` + `#modal`)，新增以下函数：

- `showDetailModal(type, item)` — 根据类型渲染详情弹窗
- `closeDetailModal()` — 关闭弹窗

弹窗布局：
- 顶部：标题/标识
- 中部：可编辑的 textarea（多行内容）
- 底部：保存 + 取消按钮

## 3. 列表项「详情」按钮

在 Memories、Lessons、Actions、Crystals 的每行/卡片中增加一个"详情"按钮。

- Memories 表格：在 Actions 列增加"详情"按钮
- Lessons 表格：新增"详情"列
- Actions 表格：新增"详情"列
- Crystals 卡片：在卡片头部增加"详情"按钮

## 4. 编辑保存

各类型保存逻辑：

| 类型 | API 端点 | 说明 |
|------|---------|------|
| Memories | `POST /agentmemory/remember` | 传入 title + content + type 创建新版本 |
| Lessons | `POST /agentmemory/lessons` | 传入 content + context + tags 更新 |
| Actions | `POST /agentmemory/actions/update` | 传入 actionId + title + description |
| Crystals | 只读 | 无更新端点，弹窗仅展示详情 |

Crystals 无更新 API，详情弹窗不提供编辑功能（或仅展示不可编辑）。
