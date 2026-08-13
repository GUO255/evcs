export type Position = [number, number];

export interface SplitLineSegment {
  coordinates: Position[];
  lengthKm: number;
}

interface RoadFeatureCollection {
  type: "FeatureCollection";
  name?: string;
  metadata?: Record<string, unknown>;
  features: Array<{
    type: "Feature";
    properties?: Record<string, unknown>;
    geometry: {
      type: "LineString" | "MultiLineString";
      coordinates: Position[] | Position[][];
    };
  }>;
}

interface SegmentCollectionOptions {
  intervalKm: number;
  name: string;
  sourceFile: string;
}

const earthRadiusKm = 6371.0088;
const epsilonKm = 1e-9;

export function buildSegmentedRoadCollection(
  source: RoadFeatureCollection,
  options: SegmentCollectionOptions,
): RoadFeatureCollection {
  const features: RoadFeatureCollection["features"] = [];

  source.features.forEach((sourceFeature, sourceFeatureIndex) => {
    const properties = sourceFeature.properties ?? {};
    const routeKey = stringProperty(properties.routeKey)
      || [stringProperty(properties.level), stringProperty(properties.ref)].filter(Boolean).join("-")
      || `route-${sourceFeatureIndex}`;
    const lines = sourceFeature.geometry.type === "LineString"
      ? [sourceFeature.geometry.coordinates as Position[]]
      : sourceFeature.geometry.coordinates as Position[][];
    const sourceChainIndex = Number.isInteger(properties.chainIndex)
      ? Number(properties.chainIndex)
      : 0;

    lines.forEach((line, lineIndex) => {
      const chainIndex = sourceChainIndex + lineIndex;
      let traversedKm = 0;
      splitLineStringByDistance(line, options.intervalKm).forEach((segment, segmentIndex) => {
        const startKm = traversedKm;
        traversedKm += segment.lengthKm;
        features.push({
          type: "Feature",
          properties: {
            ...properties,
            sourceFeatureIndex,
            segmentId: `${routeKey}-c${chainIndex}-s${segmentIndex}`,
            chainIndex,
            segmentIndex,
            startKm: roundKm(startKm),
            endKm: roundKm(traversedKm),
            lengthKm: roundKm(segment.lengthKm),
            intervalKm: options.intervalKm,
          },
          geometry: {
            type: "LineString",
            coordinates: segment.coordinates,
          },
        });
      });
    });
  });

  return {
    type: "FeatureCollection",
    name: options.name,
    metadata: {
      sourceFile: options.sourceFile,
      sourceName: source.name ?? "",
      coordinateReferenceSystem: source.metadata?.coordinateReferenceSystem ?? "EPSG:4326",
      intervalKm: options.intervalKm,
      sourceRouteCount: source.features.length,
      segmentCount: features.length,
    },
    features,
  };
}

export function splitLineStringByDistance(
  coordinates: Position[],
  intervalKm: number,
): SplitLineSegment[] {
  if (!Number.isFinite(intervalKm) || intervalKm <= 0) {
    throw new Error("intervalKm must be a positive finite number");
  }
  if (coordinates.length < 2) return [];

  const segments: SplitLineSegment[] = [];
  let currentCoordinates: Position[] = [coordinates[0]!];
  let currentLengthKm = 0;

  for (let coordinateIndex = 1; coordinateIndex < coordinates.length; coordinateIndex += 1) {
    let edgeStart = coordinates[coordinateIndex - 1]!;
    const edgeEnd = coordinates[coordinateIndex]!;
    let edgeLengthKm = distanceKm(edgeStart, edgeEnd);
    if (edgeLengthKm <= epsilonKm) continue;

    while (currentLengthKm + edgeLengthKm >= intervalKm - epsilonKm) {
      const neededKm = intervalKm - currentLengthKm;
      if (neededKm <= epsilonKm) {
        pushSegment(segments, currentCoordinates);
        currentCoordinates = [edgeStart];
        currentLengthKm = 0;
        continue;
      }

      const splitCoordinate = interpolateAtDistance(edgeStart, edgeEnd, neededKm);
      currentCoordinates.push(splitCoordinate);
      pushSegment(segments, currentCoordinates);
      currentCoordinates = [splitCoordinate];
      currentLengthKm = 0;
      edgeStart = splitCoordinate;
      edgeLengthKm = distanceKm(edgeStart, edgeEnd);
      if (edgeLengthKm <= epsilonKm) break;
    }

    if (edgeLengthKm > epsilonKm) {
      currentCoordinates.push(edgeEnd);
      currentLengthKm += edgeLengthKm;
    }
  }

  pushSegment(segments, currentCoordinates);
  return segments;
}

export function lineLengthKm(coordinates: Position[]): number {
  let lengthKm = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    lengthKm += distanceKm(coordinates[index - 1]!, coordinates[index]!);
  }
  return lengthKm;
}

function pushSegment(segments: SplitLineSegment[], coordinates: Position[]): void {
  const lengthKm = lineLengthKm(coordinates);
  if (coordinates.length > 1 && lengthKm > epsilonKm) {
    segments.push({ coordinates: [...coordinates], lengthKm });
  }
}

function distanceKm(left: Position, right: Position): number {
  const leftLatitude = toRadians(left[1]);
  const rightLatitude = toRadians(right[1]);
  const latitudeDelta = rightLatitude - leftLatitude;
  const longitudeDelta = toRadians(right[0] - left[0]);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function interpolate(left: Position, right: Position, fraction: number): Position {
  return [
    left[0] + (right[0] - left[0]) * fraction,
    left[1] + (right[1] - left[1]) * fraction,
  ];
}

function interpolateAtDistance(left: Position, right: Position, targetKm: number): Position {
  let lowerFraction = 0;
  let upperFraction = 1;
  for (let iteration = 0; iteration < 48; iteration += 1) {
    const fraction = (lowerFraction + upperFraction) / 2;
    const candidate = interpolate(left, right, fraction);
    if (distanceKm(left, candidate) < targetKm) lowerFraction = fraction;
    else upperFraction = fraction;
  }
  return interpolate(left, right, (lowerFraction + upperFraction) / 2);
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function stringProperty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function roundKm(value: number): number {
  return Number(value.toFixed(6));
}
