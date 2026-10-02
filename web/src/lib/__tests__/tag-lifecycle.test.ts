import { describe, expect, it } from "vitest";
import {
  activateTag,
  revokeTag,
  type LifecycleRepository,
} from "../tag-lifecycle";

const pending = "abcdefghijklmnopqrstuv";
const active = "bcdefghijklmnopqrstuvw";
const revoked = "cdefghijklmnopqrstuvwx";

function repository() {
  const states = new Map([
    [pending, "PENDING"],
    [active, "ACTIVE"],
    [revoked, "REVOKED"],
  ]);
  const store: LifecycleRepository = {
    async setActiveIfPending(token) {
      if (states.get(token) !== "PENDING") return false;
      states.set(token, "ACTIVE");
      return true;
    },
    async setRevokedIfUsable(token) {
      if (!["PENDING", "ACTIVE"].includes(states.get(token) ?? "")) return false;
      states.set(token, "REVOKED");
      return true;
    },
  };
  return { states, store };
}

describe("tag lifecycle", () => {
  it("activates a pending tag only once", async () => {
    const { states, store } = repository();
    expect(await activateTag(pending, store)).toBe(true);
    expect(states.get(pending)).toBe("ACTIVE");
    expect(await activateTag(pending, store)).toBe(false);
  });

  it("never activates a revoked or malformed tag", async () => {
    const { states, store } = repository();
    expect(await activateTag(revoked, store)).toBe(false);
    expect(await activateTag("bad token", store)).toBe(false);
    expect(states.get(revoked)).toBe("REVOKED");
  });

  it("revokes an active or pending tag and cannot undo revocation", async () => {
    const { states, store } = repository();
    expect(await revokeTag(active, store)).toBe(true);
    expect(await revokeTag(pending, store)).toBe(true);
    expect(states.get(active)).toBe("REVOKED");
    expect(states.get(pending)).toBe("REVOKED");
    expect(await activateTag(active, store)).toBe(false);
  });
});
