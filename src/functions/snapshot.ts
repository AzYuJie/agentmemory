import type { ISdk } from "iii-sdk";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  SnapshotMeta,
  Session,
  Memory,
  MemorySlot,
  GraphNode,
  AccessLogExport,
  Lesson,
  Insight,
  Action,
  Crystal,
  AuditEntry,
  Signal,
  Checkpoint,
  Sketch,
  Routine,
} from "../types.js";
import { KV, generateId } from "../state/schema.js";
import type { StateKV } from "../state/kv.js";
import { recordAudit } from "./audit.js";
import { VERSION } from "../version.js";
import { logger } from "../logger.js";

const COMMIT_HASH_RE = /^[0-9a-f]{7,40}$/i;

const execFileAsync = promisify(execFile);

async function gitExec(dir: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: dir });
  return stdout.trim();
}

async function ensureGitRepo(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(join(dir, ".git"))) {
    await gitExec(dir, ["init"]);
    await gitExec(dir, ["config", "user.email", "agentmemory@local"]);
    await gitExec(dir, ["config", "user.name", "agentmemory"]);
  }
}

export function registerSnapshotFunction(
  sdk: ISdk,
  kv: StateKV,
  snapshotDir: string,
): void {
  sdk.registerFunction("mem::snapshot-create", 
    async (data?: { message?: string }) => {

      try {
        await ensureGitRepo(snapshotDir);
        const ts = new Date().toISOString();

        const rawSessions = await kv.list<Session>(KV.sessions);
        const sessions = rawSessions.filter((s) => typeof s.id === "string" && s.id.trim().length > 0);
        if (rawSessions.length !== sessions.length) {
          logger.warn("Snapshot: dropped sessions with missing id", {
            dropped: rawSessions.length - sessions.length,
          });
        }
        const memories = await kv.list<Memory>(KV.memories);
        const graphNodes = await kv.list<GraphNode>(KV.graphNodes);
        const accessLogs = await kv
          .list<AccessLogExport>(KV.accessLog)
          .catch(() => [] as AccessLogExport[]);
        const slots = await kv.list<MemorySlot>(KV.slots).catch(() => [] as MemorySlot[]);
        const globalSlots = await kv.list<MemorySlot>(KV.globalSlots).catch(() => [] as MemorySlot[]);
        const lessons = await kv.list<Lesson>(KV.lessons).catch(() => [] as Lesson[]);
        const actions = await kv.list<Action>(KV.actions).catch(() => [] as Action[]);
        const crystals = await kv.list<Crystal>(KV.crystals).catch(() => [] as Crystal[]);
        const audit = await kv.list<AuditEntry>(KV.audit).catch(() => [] as AuditEntry[]);
        const insights = await kv.list<Insight>(KV.insights).catch(() => [] as Insight[]);
        const signals = await kv.list<Signal>(KV.signals).catch(() => [] as Signal[]);
        const checkpoints = await kv.list<Checkpoint>(KV.checkpoints).catch(() => [] as Checkpoint[]);
        const sentinels = await kv.list<Checkpoint>(KV.sentinels).catch(() => [] as Checkpoint[]);
        const sketches = await kv.list<Sketch>(KV.sketches).catch(() => [] as Sketch[]);
        const routines = await kv.list<Routine>(KV.routines).catch(() => [] as Routine[]);

        const observations: Record<string, unknown[]> = {};
        for (const session of sessions) {
          const obs = await kv
            .list(KV.observations(session.id))
            .catch(() => []);
          if (obs.length > 0) {
            observations[session.id] = obs;
          }
        }

        const state = {
          version: VERSION,
          timestamp: ts,
          sessions,
          memories,
          graphNodes,
          observations,
          accessLogs,
          slots,
          globalSlots,
          lessons,
          actions,
          crystals,
          audit,
          insights,
          signals,
          checkpoints,
          sentinels,
          sketches,
          routines,
        };

        writeFileSync(
          join(snapshotDir, "state.json"),
          JSON.stringify(state, null, 2),
          "utf-8",
        );

        await gitExec(snapshotDir, ["add", "."]);

        const message = data?.message || `Snapshot ${ts}`;
        try {
          await gitExec(snapshotDir, ["commit", "-m", message]);
        } catch (commitErr) {
          const errMsg =
            commitErr instanceof Error ? commitErr.message : String(commitErr);
          if (errMsg.includes("nothing to commit")) {
            return { success: true, message: "No changes to snapshot" };
          }
          throw commitErr;
        }

        const commitHash = await gitExec(snapshotDir, ["rev-parse", "HEAD"]);

        const meta: SnapshotMeta = {
          id: generateId("snap"),
          commitHash,
          createdAt: ts,
          message,
          stats: {
            sessions: sessions.length,
            observations: Object.values(observations).reduce(
              (sum, arr) => sum + arr.length,
              0,
            ),
            memories: memories.length,
            graphNodes: graphNodes.length,
            slots: slots.length + globalSlots.length,
            lessons: lessons.length,
            actions: actions.length,
            crystals: crystals.length,
            audit: audit.length,
            insights: insights.length,
            signals: signals.length,
            checkpoints: checkpoints.length,
            sentinels: sentinels.length,
            sketches: sketches.length,
            routines: routines.length,
          },
        };

        await recordAudit(kv, "export", "mem::snapshot-create", [meta.id], {
          commitHash,
          stats: meta.stats,
        });

        logger.info("Snapshot created", { commitHash });
        return { success: true, snapshot: meta };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("Snapshot failed", { error: msg });
        return { success: false, error: msg };
      }
    },
  );

  sdk.registerFunction("mem::snapshot-list",  async () => {
    try {
      if (!existsSync(join(snapshotDir, ".git"))) {
        return { snapshots: [] };
      }
      const log = await gitExec(snapshotDir, [
        "log",
        "--format=%H|%aI|%s",
        "-20",
      ]);
      const snapshots = log
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const parts = line.split("|");
          const [hash, date] = parts;
          const msg = parts.slice(2).join("|");
          return { commitHash: hash, createdAt: date, message: msg };
        });
      return { snapshots };
    } catch {
      return { snapshots: [] };
    }
  });

  sdk.registerFunction("mem::snapshot-restore", 
    async (data: { commitHash: string } | undefined) => {
      if (!data || typeof data.commitHash !== "string" || !data.commitHash.trim()) {
        return { success: false, error: "commitHash is required" };
      }
      if (!COMMIT_HASH_RE.test(data.commitHash)) {
        return { success: false, error: "Invalid commitHash format" };
      }

      try {
        await gitExec(snapshotDir, [
          "checkout",
          data.commitHash,
          "--",
          "state.json",
        ]);
        const content = readFileSync(join(snapshotDir, "state.json"), "utf-8");
        const state = JSON.parse(content) as {
          sessions?: Array<{ id: string } & Record<string, unknown>>;
          memories?: Array<{ id: string } & Record<string, unknown>>;
          graphNodes?: Array<{ id: string } & Record<string, unknown>>;
          observations?: Record<string, Array<{ id: string } & Record<string, unknown>>>;
          accessLogs?: AccessLogExport[];
          slots?: Array<{ label: string } & Record<string, unknown>>;
          globalSlots?: Array<{ label: string } & Record<string, unknown>>;
          lessons?: Array<{ id: string } & Record<string, unknown>>;
          actions?: Array<{ id: string } & Record<string, unknown>>;
          crystals?: Array<{ id: string } & Record<string, unknown>>;
          audit?: Array<{ id: string } & Record<string, unknown>>;
          insights?: Array<{ id: string } & Record<string, unknown>>;
          signals?: Array<{ id: string } & Record<string, unknown>>;
          checkpoints?: Array<{ id: string } & Record<string, unknown>>;
          sentinels?: Array<{ id: string } & Record<string, unknown>>;
          sketches?: Array<{ id: string } & Record<string, unknown>>;
          routines?: Array<{ id: string } & Record<string, unknown>>;
        };

        if (state.sessions) {
          for (const session of state.sessions) {
            if (typeof session.id === "string" && session.id.trim()) {
              await kv.set(KV.sessions, session.id, session);
            }
          }
        }
        if (state.memories) {
          for (const memory of state.memories) {
            await kv.set(KV.memories, memory.id, memory);
          }
        }
        if (state.graphNodes) {
          for (const node of state.graphNodes) {
            await kv.set(KV.graphNodes, node.id, node);
          }
        }
        if (state.observations) {
          for (const [sessionId, obs] of Object.entries(state.observations)) {
            for (const o of obs) {
              await kv.set(KV.observations(sessionId), o.id, o);
            }
          }
        }
        if (state.accessLogs) {
          for (const log of state.accessLogs) {
            await kv.set(KV.accessLog, log.memoryId, log);
          }
        }
        if (state.slots) {
          for (const slot of state.slots) {
            await kv.set(KV.slots, slot.label, slot);
          }
        }
        if (state.globalSlots) {
          for (const gs of state.globalSlots) {
            await kv.set(KV.globalSlots, gs.label, gs);
          }
        }
        if (state.lessons) {
          for (const lesson of state.lessons) {
            await kv.set(KV.lessons, lesson.id, lesson);
          }
        }
        if (state.actions) {
          for (const action of state.actions) {
            await kv.set(KV.actions, action.id, action);
          }
        }
        if (state.crystals) {
          for (const crystal of state.crystals) {
            await kv.set(KV.crystals, crystal.id, crystal);
          }
        }
        if (state.audit) {
          for (const entry of state.audit) {
            await kv.set(KV.audit, entry.id, entry);
          }
        }
        if (state.insights) {
          for (const insight of state.insights) {
            await kv.set(KV.insights, insight.id, insight);
          }
        }
        if (state.signals) {
          for (const signal of state.signals) {
            await kv.set(KV.signals, signal.id, signal);
          }
        }
        if (state.checkpoints) {
          for (const checkpoint of state.checkpoints) {
            await kv.set(KV.checkpoints, checkpoint.id, checkpoint);
          }
        }
        if (state.sentinels) {
          for (const sentinel of state.sentinels) {
            await kv.set(KV.sentinels, sentinel.id, sentinel);
          }
        }
        if (state.sketches) {
          for (const sketch of state.sketches) {
            await kv.set(KV.sketches, sketch.id, sketch);
          }
        }
        if (state.routines) {
          for (const routine of state.routines) {
            await kv.set(KV.routines, routine.id, routine);
          }
        }

        await gitExec(snapshotDir, ["checkout", "HEAD", "--", "state.json"]);

        await recordAudit(kv, "import", "mem::snapshot-restore", [], {
          commitHash: data.commitHash,
          sessions: state.sessions?.length || 0,
          memories: state.memories?.length || 0,
          graphNodes: state.graphNodes?.length || 0,
          slots: (state.slots?.length || 0) + (state.globalSlots?.length || 0),
          lessons: state.lessons?.length || 0,
          actions: state.actions?.length || 0,
          crystals: state.crystals?.length || 0,
        });

        logger.info("Snapshot restored", {
          commitHash: data.commitHash,
        });
        return { success: true, commitHash: data.commitHash };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("Snapshot restore failed", { error: msg });
        return { success: false, error: msg };
      }
    },
  );
}
