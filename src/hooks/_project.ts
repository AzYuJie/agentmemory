import { basename } from "node:path";

// Resolution order: AGENTMEMORY_PROJECT_NAME env → cwd basename.
export function resolveProject(cwd?: string): string {
  const explicit = process.env["AGENTMEMORY_PROJECT_NAME"];
  if (explicit && explicit.trim()) return explicit.trim();
  const dir = cwd && cwd.trim() ? cwd : process.cwd();
  return basename(dir);
}
