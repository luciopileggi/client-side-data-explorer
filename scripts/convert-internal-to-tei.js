#!/usr/bin/env node
const { internalToTei, readJson, validateDataset, writeText } = require("./utils");

const input = process.argv[2] || "site/data/dataset.json";
const output = process.argv[3] || "exports/tei/output.xml";
const dataset = readJson(input);
const errors = validateDataset(dataset);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

writeText(output, internalToTei(dataset));
console.log(`Exported ${dataset.length} records to ${output}`);
