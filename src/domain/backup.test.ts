import { describe, expect, it } from "vitest";
import type { Snapshot } from "./types";
import { createRushplifyArchive, mergeSnapshots, parseRushplifyArchive } from "./backup";

const snapshot = (id: string, capturedAt: string): Snapshot => ({
  id,
  name: `Point ${id}`,
  createdAt: capturedAt,
  device: "Flex Prime",
  rigCount: 1,
  setlistCount: 0,
  size: "1 KB",
  payload: { version: 1, capturedAt, objects: {}, rigs: [], setlists: [] },
});

describe("RUSHplify portable archives", () => {
  it("round-trips the current version and keeps safe workspace data", () => {
    const value = createRushplifyArchive({
      snapshots: [snapshot("one", "2026-08-29T10:00:00.000Z")],
      workspace: { favoriteRigIds: ["rig-1"], preferences: { autoBackup: true } },
      deviceIndex: { rigs: [], setlists: [] },
    });

    const parsed = parseRushplifyArchive(JSON.parse(JSON.stringify(value)));
    expect(parsed.format).toBe("rushplify-archive");
    expect(parsed.snapshots[0].id).toBe("one");
    expect(parsed.workspace.favoriteRigIds).toEqual(["rig-1"]);
    expect(parsed.workspace.preferences).toEqual({ autoBackup: true });
  });

  it("upgrades version-one exports without treating indexed files as restorable data", () => {
    const parsed = parseRushplifyArchive({
      version: 1,
      snapshots: [snapshot("legacy", "2026-08-28T10:00:00.000Z")],
      rigs: [{ id: "rig-index" }],
      setlists: [{ id: "setlist-index" }],
    });

    expect(parsed.version).toBe(2);
    expect(parsed.snapshots).toHaveLength(1);
    expect(parsed.deviceIndex.rigs).toHaveLength(1);
    expect(parsed.workspace).toEqual({});
  });

  it("rejects unrelated or malformed JSON", () => {
    expect(() => parseRushplifyArchive({ hello: "world" })).toThrow(/no supported/i);
    expect(() => parseRushplifyArchive(null)).toThrow(/not a RUSHplify/i);
  });

  it("deduplicates imported restore points and orders newest first", () => {
    const old = snapshot("same", "2026-08-27T10:00:00.000Z");
    const replacement = { ...snapshot("same", "2026-08-29T10:00:00.000Z"), name: "Replacement" };
    const middle = snapshot("middle", "2026-08-28T10:00:00.000Z");

    expect(mergeSnapshots([old, middle], [replacement]).map((item) => item.name)).toEqual(["Replacement", "Point middle"]);
  });
});
