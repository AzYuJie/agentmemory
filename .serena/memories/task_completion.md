# Task Completion Checklist

When a coding task is done, run in order:

1. **Build**: `npm run build`
   - Must compile clean (no TypeScript errors)
   - Hook scripts, viewer HTML, static assets copied to dist/

2. **Test**: `npm test`
   - All unit tests must pass (1423+ tests, excludes integration)
   - Integration test (`test/integration.test.ts`) is fine to skip locally — needs live server on :3111

3. **Verify consistency** (if MCP tools, endpoints, or version changed):
   - `test/tool-count-consistency.test.ts` must pass
   - All files in the consistency rule set updated (see `mem:core` consistency rules)

4. **Commit**:
   - `git commit -s -m "feat: ..."` (DCO sign-off required)
   - Branch naming: `feat/<name>`, `fix/<issue>-<name>`, `docs/<topic>`, `refactor/<topic>`, `chore/<topic>`

5. **PR readiness**: PRs must pass CI (GitHub Actions), get CodeRabbit review, and have linked issues.
