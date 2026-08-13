import { describe, expect, test } from "bun:test";
import { normalizeChinesePlatformPhone } from "../field-survey-import-actor";

describe("field survey collector phone normalization", () => {
  test("normalizes mainland mobile numbers to the platform identity format", () => {
    expect(normalizeChinesePlatformPhone("13800138000")).toBe("+8613800138000");
    expect(normalizeChinesePlatformPhone(" +8613800138000 ")).toBe("+8613800138000");
  });

  test("rejects source markers and malformed identities", () => {
    expect(normalizeChinesePlatformPhone("问卷星历史")).toBeNull();
    expect(normalizeChinesePlatformPhone("1380013800")).toBeNull();
  });
});
