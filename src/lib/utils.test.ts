import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("Configuration Test", () => {
  it("combines multiple class names", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });
});
