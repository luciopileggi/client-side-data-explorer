#!/usr/bin/env node
const { readJson, validateDataset } = require("./utils");

const input = process.argv[2] || "site/data/dataset.json";
const dataset = readJson(input);
const errors = validateDataset(dataset);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Valid dataset: ${dataset.length} records in ${input}`);
