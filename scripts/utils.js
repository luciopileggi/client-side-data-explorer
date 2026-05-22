const fs = require("fs");
const path = require("path");

const CSL_TYPE_LABELS = {
  "article-journal": "Journal article",
  "paper-conference": "Conference paper",
  chapter: "Book chapter",
  book: "Book",
  report: "Report",
  thesis: "Thesis",
  webpage: "Web page",
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data);
}

function creatorName(person) {
  if (!person) {
    return "";
  }
  if (person.literal) {
    return person.literal;
  }
  return [person.given, person.family].filter(Boolean).join(" ").trim();
}

function internalCreatorName(person) {
  if (!person) {
    return "";
  }
  return person.name || [person.given, person.family].filter(Boolean).join(" ").trim();
}

function firstDatePart(cslItem) {
  const parts = cslItem && cslItem.issued && Array.isArray(cslItem.issued["date-parts"])
    ? cslItem.issued["date-parts"][0]
    : null;
  return Array.isArray(parts) ? parts : [];
}

function cslDateToInternal(cslItem) {
  const parts = firstDatePart(cslItem);
  const year = Number.isFinite(parts[0]) ? parts[0] : null;
  if (!year) {
    return { year: null, date: "" };
  }
  const month = Number.isFinite(parts[1]) ? String(parts[1]).padStart(2, "0") : "";
  const day = Number.isFinite(parts[2]) ? String(parts[2]).padStart(2, "0") : "";
  return {
    year,
    date: [String(year), month, day].filter(Boolean).join("-"),
  };
}

function dateToCslIssued(record) {
  if (record.date && /^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    const [year, month, day] = record.date.split("-").map(Number);
    return { "date-parts": [[year, month, day]] };
  }
  if (record.date && /^\d{4}-\d{2}$/.test(record.date)) {
    const [year, month] = record.date.split("-").map(Number);
    return { "date-parts": [[year, month]] };
  }
  if (Number.isFinite(record.year)) {
    return { "date-parts": [[record.year]] };
  }
  return undefined;
}

function normalizeType(cslType) {
  return cslType || "item";
}

function cslToInternal(cslItem) {
  const { year, date } = cslDateToInternal(cslItem);
  const authors = Array.isArray(cslItem.author) ? cslItem.author : [];
  const containerTitle = cslItem["container-title"] || "";
  const doi = cslItem.DOI || "";
  const pmid = cslItem.PMID || "";
  const type = normalizeType(cslItem.type);

  return {
    id: cslItem.id || doi || `record-${Math.random().toString(36).slice(2)}`,
    title: cslItem.title || "Untitled",
    creator: authors
      .map((author) => ({
        name: creatorName(author),
        role: "author",
        family: author.family || "",
        given: author.given || "",
      }))
      .filter((author) => author.name),
    year,
    date,
    language: [],
    type,
    typeLabel: CSL_TYPE_LABELS[type] || type,
    description: containerTitle
      ? `${CSL_TYPE_LABELS[type] || type} published in ${containerTitle}.`
      : CSL_TYPE_LABELS[type] || type,
    identifier: {
      doi,
      pmid,
      url: doi ? `https://doi.org/${doi}` : "",
    },
    source: {
      containerTitle,
      volume: cslItem.volume || "",
      issue: cslItem.issue || "",
      pages: cslItem.page || "",
      archive: cslItem.archive || "",
      archiveLocation: cslItem.archive_location || "",
    },
    keywords: [],
  };
}

function internalToCsl(record) {
  const item = {
    id: record.id,
    type: record.type || "item",
    title: record.title,
  };
  const authors = Array.isArray(record.creator)
    ? record.creator.filter((creator) => creator.role === "author" || !creator.role)
    : [];
  if (authors.length) {
    item.author = authors.map((creator) => {
      if (creator.family || creator.given) {
        return {
          family: creator.family || "",
          given: creator.given || "",
        };
      }
      return { literal: creator.name || "" };
    });
  }
  const issued = dateToCslIssued(record);
  if (issued) {
    item.issued = issued;
  }
  if (record.source && record.source.containerTitle) {
    item["container-title"] = record.source.containerTitle;
  }
  if (record.source && record.source.volume) {
    item.volume = record.source.volume;
  }
  if (record.source && record.source.issue) {
    item.issue = record.source.issue;
  }
  if (record.source && record.source.pages) {
    item.page = record.source.pages;
  }
  if (record.identifier && record.identifier.doi) {
    item.DOI = record.identifier.doi;
  }
  if (record.identifier && record.identifier.pmid) {
    item.PMID = record.identifier.pmid;
  }
  return item;
}

function internalToJsonLd(record) {
  const creators = Array.isArray(record.creator) ? record.creator : [];
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": record.identifier && record.identifier.url ? record.identifier.url : record.id,
    identifier: record.id,
    name: record.title,
    headline: record.title,
    datePublished: record.date || (record.year ? String(record.year) : undefined),
    author: creators.map((creator) => ({
      "@type": "Person",
      name: internalCreatorName(creator),
    })),
    isPartOf: record.source && record.source.containerTitle
      ? {
          "@type": "Periodical",
          name: record.source.containerTitle,
        }
      : undefined,
    volumeNumber: record.source && record.source.volume ? record.source.volume : undefined,
    issueNumber: record.source && record.source.issue ? record.source.issue : undefined,
    pagination: record.source && record.source.pages ? record.source.pages : undefined,
    url: record.identifier && record.identifier.url ? record.identifier.url : undefined,
    sameAs: record.identifier && record.identifier.doi ? `https://doi.org/${record.identifier.doi}` : undefined,
    description: record.description || undefined,
  };
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function internalToTei(records) {
  const entries = records.map((record) => {
    const creators = Array.isArray(record.creator) ? record.creator : [];
    const authors = creators.map((creator) => {
      return [
        "        <author>",
        `          <persName>${escapeXml(internalCreatorName(creator))}</persName>`,
        "        </author>",
      ].join("\n");
    });
    const identifiers = [];
    if (record.identifier && record.identifier.doi) {
      identifiers.push(`        <idno type="DOI">${escapeXml(record.identifier.doi)}</idno>`);
    }
    if (record.identifier && record.identifier.pmid) {
      identifiers.push(`        <idno type="PMID">${escapeXml(record.identifier.pmid)}</idno>`);
    }
    return [
      `      <biblStruct xml:id="${escapeXml(record.id)}">`,
      "        <analytic>",
      `          <title level="a">${escapeXml(record.title)}</title>`,
      ...authors,
      "        </analytic>",
      "        <monogr>",
      record.source && record.source.containerTitle
        ? `          <title level="j">${escapeXml(record.source.containerTitle)}</title>`
        : "",
      `          <imprint>${record.year ? `<date when="${escapeXml(record.date || record.year)}">${escapeXml(record.year)}</date>` : ""}</imprint>`,
      "        </monogr>",
      ...identifiers,
      "      </biblStruct>",
    ].filter(Boolean).join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<TEI xmlns="http://www.tei-c.org/ns/1.0">',
    "  <teiHeader>",
    "    <fileDesc>",
    "      <titleStmt>",
    "        <title>Client-Side Data Explorer export</title>",
    "      </titleStmt>",
    "      <publicationStmt><p>Generated by client-side-data-explorer.</p></publicationStmt>",
    "      <sourceDesc><p>Derived from the canonical internal JSON dataset.</p></sourceDesc>",
    "    </fileDesc>",
    "  </teiHeader>",
    "  <text>",
    "    <body>",
    "      <listBibl>",
    ...entries,
    "      </listBibl>",
    "    </body>",
    "  </text>",
    "</TEI>",
    "",
  ].join("\n");
}

function validateRecord(record, index) {
  const errors = [];
  const prefix = `record ${index + 1}`;
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return [`${prefix}: must be an object`];
  }
  if (!record.id || typeof record.id !== "string") {
    errors.push(`${prefix}: id is required`);
  }
  if (!record.title || typeof record.title !== "string") {
    errors.push(`${prefix}: title is required`);
  }
  if (!record.type || typeof record.type !== "string") {
    errors.push(`${prefix}: type is required`);
  }
  if (record.year !== null && record.year !== undefined && !Number.isInteger(record.year)) {
    errors.push(`${prefix}: year must be an integer or null`);
  }
  if (!Array.isArray(record.creator)) {
    errors.push(`${prefix}: creator must be an array`);
  } else {
    record.creator.forEach((creator, creatorIndex) => {
      if (!creator.name || typeof creator.name !== "string") {
        errors.push(`${prefix}: creator ${creatorIndex + 1} needs a name`);
      }
    });
  }
  if (!Array.isArray(record.language)) {
    errors.push(`${prefix}: language must be an array`);
  }
  if (record.identifier && typeof record.identifier !== "object") {
    errors.push(`${prefix}: identifier must be an object`);
  }
  return errors;
}

function validateDataset(records) {
  if (!Array.isArray(records)) {
    return ["dataset must be an array"];
  }
  const seenIds = new Set();
  const errors = [];
  records.forEach((record, index) => {
    errors.push(...validateRecord(record, index));
    if (record && record.id) {
      if (seenIds.has(record.id)) {
        errors.push(`record ${index + 1}: duplicate id ${record.id}`);
      }
      seenIds.add(record.id);
    }
  });
  return errors;
}

module.exports = {
  cslToInternal,
  internalToCsl,
  internalToJsonLd,
  internalToTei,
  readJson,
  validateDataset,
  writeJson,
  writeText,
};
