import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";

import { buildSegmentedRoadCollection } from "./road-segmenter.ts";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const mapDirectory = resolve(repositoryRoot, "apps/platform-web/public/map");
const configurations = [
  {
    source: "henan-routes-expressway.geojson",
    output: "henan-expressway-segments-2km.geojson",
    name: "henan-expressway-segments-2km",
    intervalKm: 2,
  },
  {
    source: "henan-ordinary-trunk-roads.geojson",
    output: "henan-ordinary-trunk-road-segments-1km.geojson",
    name: "henan-ordinary-trunk-road-segments-1km",
    intervalKm: 1,
  },
] as const;

for (const configuration of configurations) {
  const sourcePath = resolve(mapDirectory, configuration.source);
  const outputPath = resolve(mapDirectory, configuration.output);
  const sourceBytes = await Bun.file(sourcePath).arrayBuffer();
  const source = JSON.parse(new TextDecoder().decode(sourceBytes));
  const output = buildSegmentedRoadCollection(source, {
    intervalKm: configuration.intervalKm,
    name: configuration.name,
    sourceFile: basename(sourcePath),
  });
  output.metadata = {
    ...output.metadata,
    generatedAt: new Date().toISOString(),
    sourceSha256: createHash("sha256").update(new Uint8Array(sourceBytes)).digest("hex"),
    segmentationRules: [
      "每个连续 LineString 独立分段，不跨 MultiLineString 断点连接",
      `每段最大长度为 ${configuration.intervalKm} 公里`,
      "保留不足目标长度的末尾路段",
      "使用 Haversine 距离计算分段长度，坐标保持 EPSG:4326",
    ],
  };

  const temporaryPath = `${outputPath}.tmp`;
  await Bun.write(temporaryPath, `${JSON.stringify(output)}\n`);
  await Bun.file(temporaryPath).exists() || fail(`Failed to write ${temporaryPath}`);
  await Bun.write(outputPath, Bun.file(temporaryPath));
  await Bun.file(temporaryPath).delete();

  console.log(JSON.stringify({
    output: outputPath,
    intervalKm: configuration.intervalKm,
    sourceRouteCount: output.metadata.sourceRouteCount,
    segmentCount: output.features.length,
    sizeBytes: Bun.file(outputPath).size,
  }));
}

function fail(message: string): never {
  throw new Error(message);
}

