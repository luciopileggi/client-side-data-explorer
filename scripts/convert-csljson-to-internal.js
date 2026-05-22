#!/usr/bin/env node
const { cslToInternal, readJson, validateDataset, writeJson } = require("./utils");

const input = process.argv[2] || "site/data/import/input.csl.json";
const output = process.argv[3] || "site/data/dataset.json";
const source = readJson(input);

if (!Array.isArray(source)) {
  console.error("CSL-JSON input must be an array.");
  process.exit(1);
}

const dataset = source.map(cslToInternal);
const errors = validateDataset(dataset);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

writeJson(output, dataset);
console.log(`Converted ${dataset.length} CSL records to ${output}`);
