#!/usr/bin/env node
const fs = require("fs");
const { validateDataset, writeJson } = require("./utils");

const input = process.argv[2];
const output = process.argv[3] || "site/data/research-support.dataset.json";

if (!input) {
  console.error("Usage: node scripts/convert-bibtex-to-internal.js input.bib [output.json]");
  process.exit(1);
}

const MONTHS = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const TYPE_LABELS = {
  article: "Journal article",
  book: "Book",
  inproceedings: "Conference paper",
  proceedings: "Proceedings",
  incollection: "Book chapter",
  phdthesis: "Thesis",
  mastersthesis: "Thesis",
  techreport: "Report",
  misc: "Item",
};

function normalizeText(value) {
  return String(value || "")
    .replace(/\\&/g, "&")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitTopLevel(value, separator) {
  const parts = [];
  let depth = 0;
  let quote = false;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '"' && value[index - 1] !== "\\") {
      quote = !quote;
    } else if (!quote && char === "{") {
      depth += 1;
    } else if (!quote && char === "}") {
      depth -= 1;
    } else if (!quote && depth === 0 && value.slice(index, index + separator.length) === separator) {
      parts.push(value.slice(start, index));
      start = index + separator.length;
      index += separator.length - 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function parseValue(raw) {
  const value = raw.trim().replace(/,$/, "").trim();
  if ((value.startsWith("{") && value.endsWith("}")) || (value.startsWith('"') && value.endsWith('"'))) {
    return normalizeText(value.slice(1, -1));
  }
  return normalizeText(value);
}

function parseFields(body) {
  const fields = {};
  splitTopLevel(body, ",").forEach((field) => {
    const eq = field.indexOf("=");
    if (eq === -1) {
      return;
    }
    const key = field.slice(0, eq).trim().toLowerCase();
    const value = parseValue(field.slice(eq + 1));
    if (key) {
      fields[key] = value;
    }
  });
  return fields;
}

function parseBibtex(text) {
  const entries = [];
  let index = 0;
  while (index < text.length) {
    const at = text.indexOf("@", index);
    if (at === -1) {
      break;
    }
    const typeMatch = text.slice(at).match(/^@([a-zA-Z]+)\s*\{/);
    if (!typeMatch) {
      index = at + 1;
      continue;
    }
    const type = typeMatch[1].toLowerCase();
    let cursor = at + typeMatch[0].length;
    let depth = 1;
    while (cursor < text.length && depth > 0) {
      if (text[cursor] === "{") {
        depth += 1;
      } else if (text[cursor] === "}") {
        depth -= 1;
      }
      cursor += 1;
    }
    const inner = text.slice(at + typeMatch[0].length, cursor - 1);
    const comma = inner.indexOf(",");
    if (comma !== -1) {
      entries.push({
        type,
        key: inner.slice(0, comma).trim(),
        fields: parseFields(inner.slice(comma + 1)),
      });
    }
    index = cursor;
  }
  return entries;
}

function parseAuthor(author) {
  const cleaned = normalizeText(author);
  if (cleaned.includes(",")) {
    const [family, ...rest] = cleaned.split(",").map((part) => part.trim());
    const given = rest.join(" ");
    return {
      name: [given, family].filter(Boolean).join(" "),
      role: "author",
      family,
      given,
    };
  }
  const parts = cleaned.split(/\s+/);
  const family = parts.length > 1 ? parts[parts.length - 1] : "";
  const given = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  return {
    name: cleaned,
    role: "author",
    family,
    given,
  };
}

function parseAuthors(value) {
  return splitTopLevel(value || "", " and ")
    .map(parseAuthor)
    .filter((author) => author.name);
}

function buildDate(fields) {
  const year = fields.year ? Number.parseInt(fields.year, 10) : null;
  if (!Number.isInteger(year)) {
    return { year: null, date: "" };
  }
  const month = MONTHS[String(fields.month || "").toLowerCase()];
  const day = fields.day ? String(Number.parseInt(fields.day, 10)).padStart(2, "0") : "";
  return {
    year,
    date: [String(year), month, day].filter(Boolean).join("-"),
  };
}

function entryToRecord(entry) {
  const fields = entry.fields;
  const { year, date } = buildDate(fields);
  const typeLabel = TYPE_LABELS[entry.type] || entry.type;
  const journal = fields.journal || fields.booktitle || fields.publisher || "";
  const doi = fields.doi || "";
  const url = fields.url || (doi ? `https://doi.org/${doi}` : "");
  const keywords = [
    "research-support",
    "bibtex-import",
    entry.type,
    journal ? slug(journal) : "",
  ].filter(Boolean);

  return {
    id: `research-support-${slug(entry.key) || slug(fields.title)}`,
    title: fields.title || entry.key,
    creator: parseAuthors(fields.author),
    year,
    date,
    language: [],
    type: entry.type,
    typeLabel,
    description: journal ? `${typeLabel} published in ${journal}.` : typeLabel,
    identifier: {
      doi,
      pmid: fields.pmid || "",
      url,
    },
    source: {
      containerTitle: journal,
      volume: fields.volume || "",
      issue: fields.number || "",
      pages: fields.pages || "",
      archive: "",
      archiveLocation: entry.key,
    },
    keywords: [...new Set(keywords)],
  };
}

const bibtex = fs.readFileSync(input, "utf8");
const dataset = parseBibtex(bibtex).map(entryToRecord);
const errors = validateDataset(dataset);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

writeJson(output, dataset);
console.log(`Converted ${dataset.length} BibTeX entries to ${output}`);
