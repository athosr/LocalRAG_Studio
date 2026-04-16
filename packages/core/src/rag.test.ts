import { describe, expect, it } from "vitest";
import { parseCitedRefIndices } from "./rag.js";

describe("parseCitedRefIndices", () => {
  it("parses single [#n] tokens", () => {
    expect(parseCitedRefIndices("See [#1].")).toEqual([1]);
    expect(parseCitedRefIndices("A [#2] b [#3] c")).toEqual([2, 3]);
  });

  it("parses comma-separated list inside one bracket", () => {
    expect(parseCitedRefIndices("DP-5 [#2, #5].")).toEqual([2, 5]);
    expect(parseCitedRefIndices("x [#2,#5] y")).toEqual([2, 5]);
    expect(parseCitedRefIndices("INC-2024-031 [#1].")).toEqual([1]);
  });

  it("dedupes and preserves left-to-right order", () => {
    expect(parseCitedRefIndices("[#3][#2][#3]")).toEqual([3, 2]);
  });

  it("does not treat [#12] as a multi-ref bracket", () => {
    expect(parseCitedRefIndices("only [#12]")).toEqual([12]);
  });
});
