import { describe, it, expect } from "vitest";
import { createId, splitSteps, titleCase } from "../utils";

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

describe("splitSteps", () => {
  it("should split steps by newline", () => {
    expect(splitSteps("step 1\nstep 2")).toEqual(["step 1", "step 2"]);
  });

  it("should handle Windows-style CRLF newlines", () => {
    expect(splitSteps("step 1\r\nstep 2")).toEqual(["step 1", "step 2"]);
  });

  it("should trim whitespace from each step", () => {
    expect(splitSteps("  step 1  \n\tstep 2\t")).toEqual(["step 1", "step 2"]);
  });

  it("should filter out empty lines", () => {
    expect(splitSteps("step 1\n\n\nstep 2\n  ")).toEqual(["step 1", "step 2"]);
  });

  it("should return an empty array for an empty string", () => {
    expect(splitSteps("")).toEqual([]);
  });

  it("should return an empty array for a string with only whitespace", () => {
    expect(splitSteps("   \n  \t  ")).toEqual([]);
  });
});

describe("titleCase", () => {
  it("should title case a space-separated string", () => {
    expect(titleCase("hello world")).toBe("Hello World");
  });

  it("should title case a hyphen-separated string", () => {
    expect(titleCase("hello-world")).toBe("Hello World");
  });

  it("should title case an underscore-separated string", () => {
    expect(titleCase("hello_world")).toBe("Hello World");
  });

  it("should handle mixed separators", () => {
    expect(titleCase("hello-world_test string")).toBe("Hello World Test String");
  });

  it("should handle multiple consecutive separators", () => {
    expect(titleCase("hello---world_ _test")).toBe("Hello World Test");
  });

  it("should handle strings with uppercase letters", () => {
    expect(titleCase("hELLo wORld")).toBe("Hello World");
  });

  it("should handle empty strings", () => {
    expect(titleCase("")).toBe("");
  });

  it("should handle strings with only separators", () => {
    expect(titleCase("-_  _-")).toBe("");
  });

  it("should handle strings with numbers", () => {
    expect(titleCase("step 1 part 2")).toBe("Step 1 Part 2");
  });

  it("should handle leading and trailing separators", () => {
    expect(titleCase("  _hello-world_  ")).toBe("Hello World");
  });

  it("should handle single character strings", () => {
    expect(titleCase("a")).toBe("A");
    expect(titleCase("Z")).toBe("Z");
  });
});
