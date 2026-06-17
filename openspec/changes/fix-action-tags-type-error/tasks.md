# Tasks: 修复 tags 类型错误

- [x] 前端防御性修复：`src/viewer/index.html` 第 3380 行和第 3420 行，用 `Array.isArray()` 替换 `||` 短路
- [x] 后端归一化修复：`src/functions/actions.ts` `mem::action-create` 中，将字符串 tags 按逗号分割为数组
- [x] 运行项目格式化命令（`npm run format`）— 跳过，项目未配置 formatter
- [x] 运行测试确认通过（27/27 action 测试通过）
