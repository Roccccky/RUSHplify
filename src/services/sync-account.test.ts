import { describe, expect, it } from "vitest";
import { RushplifySyncRevisionError } from "./sync-account";
import type { RushplifySyncDocument } from "../domain/rushplify-sync";

describe("RUSHplify Sync account errors", () => {
  it("retains the latest merge candidate without exposing credentials", () => {
    const latest = { schemaVersion: 1, revision: 12, updatedAt: "2026-08-30T00:00:00Z", sections: {} } as unknown as RushplifySyncDocument;
    const error = new RushplifySyncRevisionError(latest);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("RushplifySyncRevisionError");
    expect(error.latest).toBe(latest);
    expect(error.message).toContain("12");
    expect(JSON.stringify(error)).not.toContain("token");
  });
});
