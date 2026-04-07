import { describe, it, expect } from "vitest";
import { createId } from "../utils";

describe("createId", () => {
  it("should generate a unique ID with the given prefix", () => {
    const prefix = "test";
    const id = createId(prefix);
    expect(id).toMatch(new RegExp(`^${prefix}_[0-9a-f]{10}$`));
  });

  it("should generate unique IDs in succession", () => {
    const prefix = "test";
    const id1 = createId(prefix);
    const id2 = createId(prefix);
    expect(id1).not.toBe(id2);
  });
});
