import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const sourcePath = resolve(repositoryRoot, "apps/platform-web/public/map/henan-ordinary-trunk-roads.geojson");
const outputPath = resolve(repositoryRoot, "apps/site-selection-service/src/modules/road-routes/data/henan-road-route-catalog.json");
const source = await Bun.file(sourcePath).json() as {
  features?: Array<{ properties?: Record<string, unknown> }>;
};

const routes = (source.features ?? []).map(({ properties }, index) => {
  const ref = typeof properties?.ref === "string" ? properties.ref.trim().toUpperCase() : "";
  const name = typeof properties?.name === "string" ? properties.name.trim() : "";
  const fullName = typeof properties?.fullName === "string" ? properties.fullName.trim() : "";
  const level = properties?.level;
  if (!/^[GS]\d{3}$/.test(ref) || (level !== "national" && level !== "provincial")) {
    throw new Error(`Invalid road route feature ${index + 1}`);
  }
  return { ref, name, fullName, level };
}).sort((left, right) => (
  left.level.localeCompare(right.level) || left.ref.localeCompare(right.ref)
));

if (new Set(routes.map(({ ref }) => ref)).size !== routes.length) {
  throw new Error("Road route refs must be unique");
}
await Bun.write(outputPath, `${JSON.stringify(routes, null, 2)}\n`);
console.log(`Generated ${routes.length} road routes at ${outputPath}`);
