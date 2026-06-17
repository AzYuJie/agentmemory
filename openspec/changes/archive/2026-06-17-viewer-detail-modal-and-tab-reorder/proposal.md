# Proposal: viewer-detail-modal-and-tab-reorder

## 动机

查看器（viewer）用户体验优化：
1. Slots 页签位置不合理 —— 它在 Dashboard 和 Graph 之间打断了核心数据流的连贯性
2. Memories、Lessons、Actions、Crystals 列表仅展示摘要信息，用户无法查看完整详情或编辑内容

## 目标

1. 将 Slots 页签移动到 Graph 页签之后，使核心页签（Dashboard → Graph）连贯
2. 为 Memories、Lessons、Actions、Crystals 列表项增加"详情"按钮，通过弹窗展示完整内容
3. 弹窗内支持编辑内容并保存

## 范围

- 仅修改 `src/viewer/index.html`（单文件变更）
- 不新增 API 端点，复用已有 REST API
- 不改变现有功能行为
