import { describe, expect, test } from "bun:test";

import {
  buildSegmentedRoadCollection,
  splitLineStringByDistance,
} from "./road-segmenter.ts";

const oneDegreeAtEquatorKm = 111.1950802335329;

describe("splitLineStringByDistance", () => {
  test("splits a line at the requested distance and retains the tail", () => {
    const longitudeForKm = (kilometers: number) => kilometers / oneDegreeAtEquatorKm;

    const segments = splitLineStringByDistance([
      [0, 0],
      [longitudeForKm(2.5), 0],
    ], 1);

    expect(segments).toHaveLength(3);
    expect(segments.map(({ lengthKm }) => lengthKm)).toEqual([
      expect.closeTo(1, 6),
      expect.closeTo(1, 6),
      expect.closeTo(0.5, 6),
    ]);
    expect(segments[0]?.coordinates.at(-1)).toEqual(segments[1]?.coordinates[0]);
    expect(segments[1]?.coordinates.at(-1)).toEqual(segments[2]?.coordinates[0]);
  });

  test("does not exceed the interval on a long diagonal edge", () => {
    const segments = splitLineStringByDistance([
      [110, 30],
      [116, 36],
    ], 2);

    expect(Math.max(...segments.map(({ lengthKm }) => lengthKm))).toBeLessThanOrEqual(2.000001);
  });
});

describe("buildSegmentedRoadCollection", () => {
  test("segments disconnected line parts independently and preserves route properties", () => {
    const longitudeForKm = (kilometers: number) => kilometers / oneDegreeAtEquatorKm;
    const collection = buildSegmentedRoadCollection({
      type: "FeatureCollection",
      name: "roads",
      features: [{
        type: "Feature",
        properties: { level: "provincial", ref: "S253", routeKey: "ordinary-S253" },
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [[0, 0], [longitudeForKm(0.4), 0]],
            [[1, 1], [1 + longitudeForKm(0.6), 1]],
          ],
        },
      }],
    }, {
      intervalKm: 1,
      name: "road-segments",
      sourceFile: "roads.geojson",
    });

    expect(collection.features).toHaveLength(2);
    expect(collection.features.map(({ properties }) => properties?.chainIndex)).toEqual([0, 1]);
    expect(collection.features[0]?.properties).toMatchObject({
      ref: "S253",
      routeKey: "ordinary-S253",
      segmentId: "ordinary-S253-c0-s0",
      segmentIndex: 0,
      startKm: 0,
      intervalKm: 1,
    });
    expect(collection.features[0]?.geometry.coordinates.at(-1)).not.toEqual(
      collection.features[1]?.geometry.coordinates[0],
    );
  });
});
