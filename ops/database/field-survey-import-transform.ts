export type ScalarConversionIssue =
  | "ambiguous_distance"
  | "ambiguous_site_area"
  | "missing_contact"
  | "missing_contact_phone"
  | "ambiguous_contact_phone";

export type NumericConversion = {
  value: number;
  issue: Extract<ScalarConversionIssue, "ambiguous_distance" | "ambiguous_site_area"> | null;
};

export type SourceAnswer = {
  fieldId: string;
  answerValue: string;
  followupValue: string;
  answerJson: string;
};

export type SourceAttachment = {
  id: string;
  fieldId: string;
  fileUrl: string;
  objectKey: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
};

export type SourceSubmission = {
  id: string;
  version: string;
  city: string;
  submittedAt: number;
  updatedAt: number;
  submitterUserId: string;
  submitterName: string;
  submitterPhoneNumber: string;
  answers: SourceAnswer[];
  attachments: SourceAttachment[];
};

export type ImageCopy = SourceAttachment & {
  targetField: "satelliteImages" | "accessConvenienceImages" | "landSceneImages" | "otherStructureImages";
};
export type SourceAttachmentCopy = SourceAttachment & {
  targetField: "sourceSatelliteAttachments" | "sourceAccessConvenienceAttachments" | "sourceLandSceneAttachments" | "sourceOtherStructureAttachments";
};

export type FieldSurveyImportTarget = {
  sourceSubmissionId: string;
  sourceSubmitterUserId: string;
  sourceSubmitterPhoneNumber: string;
  status: number;
  explorerName: string;
  explorationDate: string;
  projectName: string;
  contactName: string;
  contactPhone: string;
  provinceCity: string;
  countyDistrict: string;
  locationAddress: string;
  longitude: number;
  latitude: number;
  siteAreaSquareMeters: number;
  highwayDistanceMeters: number;
  arterialRoadDistanceMeters: number;
  accessConvenience: number;
  landQualified: number;
  landType: number;
  hasLandProof: number;
  hasLeaseAgreement: number;
  hasOtherStructures: number;
  groundHardening: number;
  terrainCondition: number;
  capacityDescription: string;
  transportCapacityDescription: string;
  hasNearbyTruckChargingStation: number;
  nearbyTruckChargingStationDescription: string;
  cooperationMode: number;
  cooperationTerms: string;
  siteMaturity: number;
  importantNotes: string;
};

export type FieldSurveyTransformResult = {
  target: FieldSurveyImportTarget;
  dedupeKey: string;
  imageCopies: ImageCopy[];
  sourceAttachmentCopies: SourceAttachmentCopy[];
  issues: string[];
};

export type ExistingExplorationIdentity = {
  projectName: string;
  longitude: number;
  latitude: number;
};

export type FieldSurveyDryRunReport = {
  sourceSubmissions: number;
  existingTargetSites: number;
  wouldInsert: number;
  skippedExisting: number;
  sourceDuplicateIdentities: number;
  issuesByCode: Record<string, number>;
  imageCopies: { files: number; bytes: number };
  sourceAttachmentCopies: { files: number; bytes: number };
  dbWrites: false;
  ossWrites: false;
};

const IMAGE_FIELDS = {
  satelliteImage: "satelliteImages",
  accessConvenienceImages: "accessConvenienceImages",
  landSceneImage: "landSceneImages",
  attachmentsImages: "otherStructureImages",
} as const;

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4",
]);
const SOURCE_ATTACHMENT_FIELDS = {
  satelliteImage: "sourceSatelliteAttachments",
  accessConvenienceImages: "sourceAccessConvenienceAttachments",
  landSceneImage: "sourceLandSceneAttachments",
  attachmentsImages: "sourceOtherStructureAttachments",
} as const;

export function transformFieldSurveySubmission(source: SourceSubmission): FieldSurveyTransformResult {
  const answers = new Map(source.answers.map((answer) => [answer.fieldId, answer]));
  const value = (fieldId: string) => answers.get(fieldId)?.answerValue.trim() ?? "";
  const followup = (fieldId: string) => answers.get(fieldId)?.followupValue.trim() ?? "";
  const issues: string[] = [];

  const contact = parseContact(value("contact"));
  if (contact.issue) issues.push(contact.issue);

  const location = parseLocation(answers.get("location"));
  if (!location.district) issues.push("missing_county_district");

  const siteArea = parseSiteAreaSquareMeters(value("siteArea"));
  if (siteArea.issue) issues.push(siteArea.issue);
  const highwayDistance = parseDistanceMeters(value("highwayDistance"));
  if (highwayDistance.issue) issues.push("ambiguous_distance:highwayDistance");
  const arterialDistance = parseDistanceMeters(value("arterialDistance"));
  if (arterialDistance.issue) issues.push("ambiguous_distance:arterialDistance");

  const coordinate = gcj02ToWgs84(location.longitude, location.latitude);
  const longitude = roundCoordinate(coordinate.longitude);
  const latitude = roundCoordinate(coordinate.latitude);

  const imageCopies: ImageCopy[] = [];
  const sourceAttachmentCopies: SourceAttachmentCopy[] = [];
  for (const attachment of source.attachments) {
    const targetField = IMAGE_FIELDS[attachment.fieldId as keyof typeof IMAGE_FIELDS];
    if (!targetField) {
      issues.push(`unmapped_attachment_field:${attachment.fieldId}`);
      continue;
    }
    const contentType = attachment.contentType.toLowerCase();
    if (SUPPORTED_ATTACHMENT_TYPES.has(contentType)) {
      const sourceTargetField = SOURCE_ATTACHMENT_FIELDS[
        attachment.fieldId as keyof typeof SOURCE_ATTACHMENT_FIELDS
      ];
      sourceAttachmentCopies.push({
        ...attachment,
        targetField: sourceTargetField,
      });
      continue;
    }
    if (!SUPPORTED_IMAGE_TYPES.has(contentType)) {
      issues.push(`unsupported_attachment_content_type:${attachment.fieldId}:${attachment.contentType}`);
      continue;
    }
    imageCopies.push({ ...attachment, targetField });
  }

  const projectName = value("projectName");
  const nearbyValue = value("nearbyNewEnergyTruckChargingStation");
  const target: FieldSurveyImportTarget = {
    sourceSubmissionId: source.id,
    sourceSubmitterUserId: source.submitterUserId,
    sourceSubmitterPhoneNumber: source.submitterPhoneNumber.trim(),
    status: 1,
    explorerName: source.submitterName.trim() || "生产问卷导入",
    explorationDate: formatChinaDate(source.submittedAt),
    projectName,
    contactName: contact.name,
    contactPhone: contact.phone,
    provinceCity: location.city || source.city.trim(),
    countyDistrict: location.district,
    locationAddress: location.address,
    longitude,
    latitude,
    siteAreaSquareMeters: siteArea.value,
    highwayDistanceMeters: highwayDistance.value,
    arterialRoadDistanceMeters: arterialDistance.value,
    accessConvenience: mapExact(value("accessConvenience"), {
      "便利性很好（从主干道无需绕行进入）": 1,
      "便利性较好（从主干道简单绕行进入）": 2,
      "便利性一般（从主干道复杂绕行进入）": 3,
    }),
    landQualified: mapBoolean(value("landQualified")),
    landType: mapExact(value("landType"), {
      "建设用地": 1,
      "集体经营性用地": 2,
      "划拨用地": 3,
      "其他明确可用于建设经营性充电基础设施的用地": 4,
    }),
    hasLandProof: mapBoolean(value("landProof")),
    hasLeaseAgreement: mapBoolean(value("leaseAgreement")),
    hasOtherStructures: mapBoolean(value("attachments")),
    groundHardening: mapExact(value("groundHardening"), {
      "地面硬化较好，无需硬化": 1,
      "地面硬化一般，需要硬化": 2,
      "地面无硬化": 3,
    }),
    terrainCondition: mapExact(value("terrain"), {
      "地势较高不积水/有良好排水": 1,
      "地势平坦不易积水": 2,
      "地势低洼易积水": 3,
    }),
    capacityDescription: value("capacity"),
    transportCapacityDescription: value("transportCapacity"),
    hasNearbyTruckChargingStation: nearbyValue.startsWith("有") ? 1 : 0,
    nearbyTruckChargingStationDescription: nearbyValue.startsWith("有") ? followup("nearbyNewEnergyTruckChargingStation") : "",
    cooperationMode: mapExact(value("cooperationMode"), { "服务费分成": 1, "净利润分成": 2, "固定租金": 3 }),
    cooperationTerms: followup("cooperationMode"),
    siteMaturity: mapExact(value("maturity"), {
      "A类站点：可立刻签约合同": 1,
      "B类站点：场站位置非常好，但欠缺合同签约条件": 2,
      "C类站点：储备站点": 3,
    }),
    importantNotes: value("importantNotes"),
  };

  return {
    target,
    dedupeKey: `${projectName}\u0000${longitude.toFixed(6)}\u0000${latitude.toFixed(6)}`,
    imageCopies,
    sourceAttachmentCopies,
    issues,
  };
}

export function createFieldSurveyDryRunReport(
  transformed: FieldSurveyTransformResult[],
  existing: ExistingExplorationIdentity[],
): FieldSurveyDryRunReport {
  const existingKeys = new Set(existing.map(({ projectName, longitude, latitude }) =>
    fieldSurveyIdentityKey(projectName, longitude, latitude)
  ));
  const sourceIdentityCounts = new Map<string, number>();
  const issuesByCode: Record<string, number> = {};
  let imageFiles = 0;
  let imageBytes = 0;
  let sourceAttachmentFiles = 0;
  let sourceAttachmentBytes = 0;

  for (const result of transformed) {
    sourceIdentityCounts.set(result.dedupeKey, (sourceIdentityCounts.get(result.dedupeKey) ?? 0) + 1);
    for (const issue of result.issues) issuesByCode[issue] = (issuesByCode[issue] ?? 0) + 1;
    imageFiles += result.imageCopies.length;
    imageBytes += result.imageCopies.reduce((sum, image) => sum + image.fileSizeBytes, 0);
    sourceAttachmentFiles += result.sourceAttachmentCopies.length;
    sourceAttachmentBytes += result.sourceAttachmentCopies.reduce((sum, attachment) => sum + attachment.fileSizeBytes, 0);
  }

  const sourceDuplicateIdentities = [...sourceIdentityCounts.values()]
    .reduce((count, occurrences) => count + Math.max(0, occurrences - 1), 0);
  const uniqueSourceKeys = [...sourceIdentityCounts.keys()];
  const skippedExisting = transformed.filter((result) => existingKeys.has(result.dedupeKey)).length;
  const wouldInsert = uniqueSourceKeys.filter((key) => !existingKeys.has(key)).length;

  return {
    sourceSubmissions: transformed.length,
    existingTargetSites: existing.length,
    wouldInsert,
    skippedExisting,
    sourceDuplicateIdentities,
    issuesByCode: Object.fromEntries(Object.entries(issuesByCode).sort(([left], [right]) => left.localeCompare(right))),
    imageCopies: { files: imageFiles, bytes: imageBytes },
    sourceAttachmentCopies: { files: sourceAttachmentFiles, bytes: sourceAttachmentBytes },
    dbWrites: false,
    ossWrites: false,
  };
}

export function parseDistanceMeters(raw: string): NumericConversion {
  const value = raw.trim();
  if (/^0(?:\.0+)?$/u.test(value)) return { value: 0, issue: null };
  if (hasNumericRange(value)) return { value: 0, issue: "ambiguous_distance" };

  const matches = [...value.matchAll(/(\d+(?:\.\d+)?)\s*(公里|千米|米)/gu)];
  if (matches.length !== 1) return { value: 0, issue: "ambiguous_distance" };
  const amount = Number(matches[0]![1]);
  const unit = matches[0]![2];
  const meters = unit === "米" ? amount : amount * 1_000;
  if (!Number.isFinite(meters) || meters < 0) return { value: 0, issue: "ambiguous_distance" };
  return { value: Math.round(meters), issue: null };
}

export function parseSiteAreaSquareMeters(raw: string): NumericConversion {
  const value = raw.trim();
  if (hasNumericRange(value)) return { value: 0, issue: "ambiguous_site_area" };

  const matches = [...value.matchAll(/(\d+(?:\.\d+)?)\s*(平方米|平米|㎡|亩)/gu)];
  if (matches.length !== 1) return { value: 0, issue: "ambiguous_site_area" };
  const amount = Number(matches[0]![1]);
  const squareMeters = matches[0]![2] === "亩" ? amount * 2_000 / 3 : amount;
  if (!Number.isFinite(squareMeters) || squareMeters < 0) {
    return { value: 0, issue: "ambiguous_site_area" };
  }
  return { value: Number(squareMeters.toFixed(2)), issue: null };
}

export function parseContact(raw: string): {
  name: string;
  phone: string;
  issue: Extract<ScalarConversionIssue, "missing_contact" | "missing_contact_phone" | "ambiguous_contact_phone"> | null;
} {
  const value = raw.trim();
  if (!value) return { name: "", phone: "", issue: "missing_contact" };

  const matches = [...value.matchAll(/1[3-9](?:[\s-]?\d){9}/gu)];
  if (matches.length === 0) return { name: value, phone: "", issue: "missing_contact_phone" };
  if (matches.length > 1) return { name: value, phone: "", issue: "ambiguous_contact_phone" };

  const matched = matches[0]![0];
  const phone = matched.replace(/[^\d]/gu, "");
  const name = value.replace(matched, "").replace(/^[\s,，、;；:：-]+|[\s,，、;；:：-]+$/gu, "").trim();
  return { name, phone, issue: null };
}

function hasNumericRange(value: string): boolean {
  return /\d+(?:\.\d+)?\s*(?:-|—|~|～|至|到)\s*\d+(?:\.\d+)?/u.test(value);
}

function parseLocation(answer: SourceAnswer | undefined): {
  address: string;
  city: string;
  district: string;
  longitude: number;
  latitude: number;
} {
  if (!answer?.answerJson) throw new Error("missing_location_json");
  const parsed = JSON.parse(answer.answerJson) as Record<string, unknown>;
  const longitude = Number(parsed.longitude);
  const latitude = Number(parsed.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) throw new Error("invalid_location_coordinate");
  return {
    address: stringValue(parsed.address) || answer.answerValue.trim(),
    city: stringValue(parsed.city),
    district: stringValue(parsed.district),
    longitude,
    latitude,
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

export function fieldSurveyIdentityKey(projectName: string, longitude: number, latitude: number): string {
  return `${projectName.trim()}\u0000${Number(longitude).toFixed(6)}\u0000${Number(latitude).toFixed(6)}`;
}

export function createFieldSurveyIncrementalPlan<T extends { dedupeKey: string }>(
  transformed: readonly T[],
  existing: readonly ExistingExplorationIdentity[],
): { pending: T[]; skippedExisting: T[] } {
  const sourceKeys = new Set<string>();
  for (const item of transformed) {
    if (sourceKeys.has(item.dedupeKey)) {
      throw new Error(`Duplicate source site identity: ${item.dedupeKey}`);
    }
    sourceKeys.add(item.dedupeKey);
  }
  const existingKeys = new Set(existing.map(({ projectName, longitude, latitude }) =>
    fieldSurveyIdentityKey(projectName, longitude, latitude)
  ));
  return {
    pending: transformed.filter((item) => !existingKeys.has(item.dedupeKey)),
    skippedExisting: transformed.filter((item) => existingKeys.has(item.dedupeKey)),
  };
}

export function assertConfirmedFieldSurveyIncrementalTarget(
  databaseUrl: string,
  confirmation: string,
): void {
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const expected = `${url.hostname}:${url.port || "3306"}/${database}`;
  if (!database || confirmation !== expected) {
    throw new Error(`Field survey incremental target confirmation mismatch: expected ${expected}`);
  }
}

function formatChinaDate(unixSeconds: number): string {
  const chinaTime = new Date((unixSeconds + 8 * 60 * 60) * 1_000);
  return [
    chinaTime.getUTCFullYear(),
    String(chinaTime.getUTCMonth() + 1).padStart(2, "0"),
    String(chinaTime.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function mapBoolean(value: string): number {
  return value === "是" ? 1 : 0;
}

function mapExact(value: string, values: Readonly<Record<string, number>>): number {
  return values[value] ?? 0;
}
import { gcj02ToWgs84 } from "../../packages/geo-coordinates/src/index";
