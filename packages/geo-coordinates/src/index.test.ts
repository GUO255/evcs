import { describe, expect, test } from "bun:test";

import { gcj02ToWgs84, wgs84ToGcj02 } from "./index.ts";

describe("WGS84 and GCJ-02 conversion", () => {
  test("converts a known Beijing WGS84 control point to GCJ-02", () => {
    const result = wgs84ToGcj02(116.397128, 39.916527);
    expect(result.longitude).toBeCloseTo(116.403372, 5);
    expect(result.latitude).toBeCloseTo(39.917931, 5);
  });

  test("iteratively reverses a Henan coordinate within one centimeter-scale degree tolerance", () => {
    const source = { longitude: 113.413, latitude: 34.43097 };
    const gcj02 = wgs84ToGcj02(source.longitude, source.latitude);
    const restored = gcj02ToWgs84(gcj02.longitude, gcj02.latitude);
    expect(restored.longitude).toBeCloseTo(source.longitude, 7);
    expect(restored.latitude).toBeCloseTo(source.latitude, 7);
  });

  test("keeps coordinates outside China unchanged", () => {
    expect(wgs84ToGcj02(-74.006, 40.7128)).toEqual({
      latitude: 40.7128,
      longitude: -74.006,
    });
    expect(gcj02ToWgs84(-74.006, 40.7128)).toEqual({
      latitude: 40.7128,
      longitude: -74.006,
    });
  });

  test("rejects non-finite and out-of-range coordinates", () => {
    for (const [longitude, latitude] of [
      [Number.NaN, 34],
      [113, Number.POSITIVE_INFINITY],
      [181, 34],
      [113, 91],
    ]) {
      expect(() => wgs84ToGcj02(longitude, latitude)).toThrow("坐标无效");
      expect(() => gcj02ToWgs84(longitude, latitude)).toThrow("坐标无效");
    }
  });
});
