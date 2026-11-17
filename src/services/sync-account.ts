import type { RushplifySyncDocument } from "../domain/rushplify-sync";

/**
 * Account backends implement one compare-and-swap document per RUSHplify account.
 * Authentication tokens belong to the platform credential store and are never
 * accepted as part of a RushplifySyncDocument.
 */
export interface RushplifySyncAccountTransport {
  pull(accountId: string): Promise<RushplifySyncDocument | null>;
  push(accountId: string, document: RushplifySyncDocument, expectedRevision: number): Promise<RushplifySyncDocument>;
}

export class RushplifySyncRevisionError extends Error {
  constructor(public readonly latest: RushplifySyncDocument) {
    super(`RUSHplify Sync revision changed to ${latest.revision}. Pull and merge before retrying.`);
    this.name = "RushplifySyncRevisionError";
  }
}
