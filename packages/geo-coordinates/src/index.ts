export type GeographicCoordinate = {
  latitude: number;
  longitude: number;
};

const SEMI_MAJOR_AXIS = 6_378_245;
const ECCENTRICITY_SQUARED = 0.006693421622965943;
const INVERSE_THRESHOLD = 1e-8;
const MAX_INVERSE_ITERATIONS = 30;

export function wgs84ToGcj02(
  longitude: number,
  latitude: number,
): GeographicCoordinate {
  assertCoordinate(longitude, latitude);
  if (isOutsideChina(longitude, latitude)) return { latitude, longitude };

  const latitudeRadians = latitude / 180 * Math.PI;
  const magic = 1 - ECCENTRICITY_SQUARED * Math.sin(latitudeRadians) ** 2;
  const squareRootMagic = Math.sqrt(magic);
  const latitudeDelta = transformLatitude(longitude - 105, latitude - 35) * 180 /
    ((SEMI_MAJOR_AXIS * (1 - ECCENTRICITY_SQUARED) / (magic * squareRootMagic)) * Math.PI);
  const longitudeDelta = transformLongitude(longitude - 105, latitude - 35) * 180 /
    ((SEMI_MAJOR_AXIS / squareRootMagic * Math.cos(latitudeRadians)) * Math.PI);

  return {
    latitude: latitude + latitudeDelta,
    longitude: longitude + longitudeDelta,
  };
}

export function gcj02ToWgs84(
  longitude: number,
  latitude: number,
): GeographicCoordinate {
  assertCoordinate(longitude, latitude);
  if (isOutsideChina(longitude, latitude)) return { latitude, longitude };

  let minimumLongitude = longitude - 0.01;
  let maximumLongitude = longitude + 0.01;
  let minimumLatitude = latitude - 0.01;
  let maximumLatitude = latitude + 0.01;
  let candidateLongitude = longitude;
  let candidateLatitude = latitude;

  for (let iteration = 0; iteration < MAX_INVERSE_ITERATIONS; iteration += 1) {
    candidateLongitude = (minimumLongitude + maximumLongitude) / 2;
    candidateLatitude = (minimumLatitude + maximumLatitude) / 2;
    const projected = wgs84ToGcj02(candidateLongitude, candidateLatitude);
    const longitudeDifference = projected.longitude - longitude;
    const latitudeDifference = projected.latitude - latitude;
    if (
      Math.abs(longitudeDifference) <= INVERSE_THRESHOLD &&
      Math.abs(latitudeDifference) <= INVERSE_THRESHOLD
    ) {
      break;
    }
    if (longitudeDifference > 0) maximumLongitude = candidateLongitude;
    else minimumLongitude = candidateLongitude;
    if (latitudeDifference > 0) maximumLatitude = candidateLatitude;
    else minimumLatitude = candidateLatitude;
  }

  return { latitude: candidateLatitude, longitude: candidateLongitude };
}

function assertCoordinate(longitude: number, latitude: number) {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("坐标无效");
  }
}

function isOutsideChina(longitude: number, latitude: number) {
  return longitude < 72.004 || longitude > 137.8347 ||
    latitude < 0.8293 || latitude > 55.8271;
}

function transformLatitude(longitude: number, latitude: number) {
  let result = -100 + 2 * longitude + 3 * latitude + 0.2 * latitude ** 2 +
    0.1 * longitude * latitude + 0.2 * Math.sqrt(Math.abs(longitude));
  result += (20 * Math.sin(6 * longitude * Math.PI) +
    20 * Math.sin(2 * longitude * Math.PI)) * 2 / 3;
  result += (20 * Math.sin(latitude * Math.PI) +
    40 * Math.sin(latitude / 3 * Math.PI)) * 2 / 3;
  result += (160 * Math.sin(latitude / 12 * Math.PI) +
    320 * Math.sin(latitude * Math.PI / 30)) * 2 / 3;
  return result;
}

function transformLongitude(longitude: number, latitude: number) {
  let result = 300 + longitude + 2 * latitude + 0.1 * longitude ** 2 +
    0.1 * longitude * latitude + 0.1 * Math.sqrt(Math.abs(longitude));
  result += (20 * Math.sin(6 * longitude * Math.PI) +
    20 * Math.sin(2 * longitude * Math.PI)) * 2 / 3;
  result += (20 * Math.sin(longitude * Math.PI) +
    40 * Math.sin(longitude / 3 * Math.PI)) * 2 / 3;
  result += (150 * Math.sin(longitude / 12 * Math.PI) +
    300 * Math.sin(longitude / 30 * Math.PI)) * 2 / 3;
  return result;
}
