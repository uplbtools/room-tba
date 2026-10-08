import { describe, expect, test } from "bun:test";
import {
  generateProposalToken,
  hashProposalToken,
  proposalTokenMatches,
} from "./proposal-token";

describe("proposal owner token", () => {
  test("tokens are long, URL-safe and unique", () => {
    const a = generateProposalToken();
    const b = generateProposalToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  test("only the SHA-256 is stored, never the token", () => {
    const token = generateProposalToken();
    const hash = hashProposalToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
  });

  test("matches the right token and nothing else", () => {
    const token = generateProposalToken();
    const hash = hashProposalToken(token);
    expect(proposalTokenMatches(token, hash)).toBe(true);
    expect(proposalTokenMatches(generateProposalToken(), hash)).toBe(false);
    expect(proposalTokenMatches(hash, hash)).toBe(false);
  });

  test("rejects missing, malformed or oversized input", () => {
    const token = generateProposalToken();
    const hash = hashProposalToken(token);
    expect(proposalTokenMatches(undefined, hash)).toBe(false);
    expect(proposalTokenMatches(123, hash)).toBe(false);
    expect(proposalTokenMatches("short", hash)).toBe(false);
    expect(proposalTokenMatches("x".repeat(500), hash)).toBe(false);
    expect(proposalTokenMatches(token, null)).toBe(false);
    expect(proposalTokenMatches(token, "abc")).toBe(false);
  });
});
