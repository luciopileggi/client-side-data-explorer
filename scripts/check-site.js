#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { readJson, validateDataset } = require("./utils");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const requireDataset = args.includes("--require-dataset");
const siteArg = args.find((arg) => arg !== "--require-dataset") || "site";
const siteRoot = path.resolve(root, siteArg);

const requiredFiles = [
  "index.html",
  "detail.html",
  "credits.html",
  "app.js",
  "styles.css",
  ".nojekyll",
  "data/site.config.json",
  "data/schema.json",
];

function isSafeRelativePath(value) {
  const input = String(value || "").trim();
  if (!input || input.startsWith("/") || input.startsWith("//") || input.includes("\\") || input.includes("?") || input.includes("#")) {
    return false;
  }
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input)) {
    return false;
  }
  return !input.split("/").some((segment) => segment === "..");
}

function sitePath(relativePath) {
  const target = path.resolve(siteRoot, relativePath);
  const rel = path.relative(siteRoot, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Refusing to read outside site root: ${relativePath}`);
  }
  return target;
}

function validateJsonFile(relativePath) {
  readJson(sitePath(relativePath));
}

function validateDatasetFile(relativePath) {
  const dataset = readJson(sitePath(relativePath));
  const errors = validateDataset(dataset);
  if (errors.length) {
    throw new Error(`${relativePath} is invalid:\n${errors.join("\n")}`);
  }
}

function publicDatasetFiles() {
  const dataDir = sitePath("data");
  return fs.readdirSync(dataDir)
    .filter((fileName) => fileName.endsWith(".dataset.json"))
    .map((fileName) => `data/${fileName}`)
    .sort();
}

function check() {
  requiredFiles.forEach((relativePath) => {
    if (!fs.existsSync(sitePath(relativePath))) {
      throw new Error(`Missing site file: ${relativePath}`);
    }
  });

  const siteConfig = readJson(sitePath("data/site.config.json"));
  const configuredDataset = siteConfig.datasetUrl || "data/dataset.json";
  if (!isSafeRelativePath(configuredDataset)) {
    throw new Error("data/site.config.json contains an unsafe datasetUrl");
  }
  const configuredDatasetPath = sitePath(configuredDataset);
  const configuredDatasetExists = fs.existsSync(configuredDatasetPath);
  if (requireDataset && !configuredDatasetExists) {
    throw new Error(`Configured dataset does not exist in site: ${configuredDataset}`);
  }

  validateJsonFile("data/site.config.json");
  [...new Set([...publicDatasetFiles(), configuredDatasetExists ? configuredDataset : null].filter(Boolean))]
    .forEach(validateDatasetFile);

  const disallowed = ["scripts", "docs", "exports", "data/import", "data/export"];
  const found = disallowed.filter((relativePath) => fs.existsSync(sitePath(relativePath)));
  if (found.length) {
    throw new Error(`Disallowed publish paths inside site: ${found.join(", ")}`);
  }

  console.log(`Site check passed: ${path.relative(root, siteRoot) || "."}`);
  console.log(`Configured dataset: ${configuredDataset}`);
  if (!configuredDatasetExists) {
    console.log("Configured dataset is not present. Add it before publishing, or run with --require-dataset in deployment checks.");
  }
}

try {
  check();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
