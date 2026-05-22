#!/usr/bin/env node
const fs = require("fs");
const { validateDataset, writeJson } = require("./utils");

const input = process.argv[2] || "exports/tei/output.xml";
const output = process.argv[3] || "exports/tei/imported.dataset.json";
const xml = fs.readFileSync(input, "utf8");

function unescapeXml(value) {
  return String(value || "")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function matchOne(pattern, text) {
  const match = text.match(pattern);
  return match ? unescapeXml(match[1].trim()) : "";
}

const records = [...xml.matchAll(/<biblStruct\b[^>]*xml:id="([^"]+)"[^>]*>([\s\S]*?)<\/biblStruct>/g)]
  .map((match) => {
    const id = unescapeXml(match[1]);
    const body = match[2];
    const title = matchOne(/<title\b[^>]*level="a"[^>]*>([\s\S]*?)<\/title>/, body) || "Untitled";
    const containerTitle = matchOne(/<title\b[^>]*level="j"[^>]*>([\s\S]*?)<\/title>/, body);
    const yearText = matchOne(/<date\b[^>]*>([\s\S]*?)<\/date>/, body);
    const year = /^\d+$/.test(yearText) ? Number(yearText) : null;
    const creators = [...body.matchAll(/<persName>([\s\S]*?)<\/persName>/g)].map((creator) => ({
      name: unescapeXml(creator[1].trim()),
      role: "author",
    }));
    const doi = matchOne(/<idno\b[^>]*type="DOI"[^>]*>([\s\S]*?)<\/idno>/, body);
    const pmid = matchOne(/<idno\b[^>]*type="PMID"[^>]*>([\s\S]*?)<\/idno>/, body);

    return {
      id,
      title,
      creator: creators,
      year,
      date: year ? String(year) : "",
      language: [],
      type: "article-journal",
      typeLabel: "Journal article",
      description: containerTitle ? `Journal article published in ${containerTitle}.` : "Journal article",
      identifier: {
        doi,
        pmid,
        url: doi ? `https://doi.org/${doi}` : "",
      },
      source: {
        containerTitle,
        volume: "",
        issue: "",
        pages: "",
        archive: "",
        archiveLocation: "",
      },
      keywords: [],
    };
  });

const errors = validateDataset(records);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

writeJson(output, records);
console.log(`Imported ${records.length} TEI records to ${output}`);
