import { encodeZip } from "./zip";

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function escapeXml(value: unknown): string {
  return String(value)
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

export function buildXlsx(rows: ReadonlyArray<Record<string, unknown>>): Uint8Array {
  const columns = ["id", "projectName", "provinceCity", "countyDistrict", "status", "explorerName", "explorationDate", "overallScore", "selectionRecommendation", "updatedAt"];
  const header = columns.map((column, index) => {
    const cellReference = `${String.fromCharCode(65 + index)}1`;
    return `<c r="${cellReference}" t="inlineStr"><is><t>${escapeXml(column)}</t></is></c>`;
  }).join("");
  const body = rows.map((row, rowIndex) => (
    `<row r="${rowIndex + 2}">${columns.map((column, index) => {
      const cellReference = `${String.fromCharCode(65 + index)}${rowIndex + 2}`;
      return `<c r="${cellReference}" t="inlineStr"><is><t>${escapeXml(row[column] ?? "")}</t></is></c>`;
    }).join("")}</row>`
  )).join("");
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${header}${body}</sheetData></worksheet>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="勘探站点" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  return encodeZip([
    { name: "[Content_Types].xml", content: utf8(contentTypes) },
    { name: "_rels/.rels", content: utf8(rels) },
    { name: "xl/workbook.xml", content: utf8(workbook) },
    { name: "xl/_rels/workbook.xml.rels", content: utf8(workbookRels) },
    { name: "xl/worksheets/sheet1.xml", content: utf8(sheet) },
  ]);
}

export function buildDocx(paragraphs: readonly string[]): Uint8Array {
  const body = paragraphs.map((paragraph) => (
    `<w:p><w:r><w:t xml:space="preserve">${escapeXml(paragraph)}</w:t></w:r></w:p>`
  )).join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800"/></w:sectPr></w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return encodeZip([
    { name: "[Content_Types].xml", content: utf8(contentTypes) },
    { name: "_rels/.rels", content: utf8(rels) },
    { name: "word/document.xml", content: utf8(document) },
  ]);
}
