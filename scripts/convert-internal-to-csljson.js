#!/usr/bin/env node
const { internalToCsl, readJson, validateDataset, writeJson } = require("./utils");

const input = process.argv[2] || "site/data/dataset.json";
const output = process.argv[3] || "exports/csljson/output.json";
const dataset = readJson(input);
const errors = validateDataset(dataset);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

writeJson(output, dataset.map(internalToCsl));
console.log(`Exported ${dataset.length} records to ${output}`);
