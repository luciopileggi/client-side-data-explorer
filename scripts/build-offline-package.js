#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { readJson, validateDataset, writeText } = require("./utils");

const root = path.resolve(__dirname, "..");
const siteRoot = path.join(root, "site");
const exportsRoot = path.join(root, "exports");
const packageName = "client-side-data-explorer-offline-demo";
const packageRoot = path.join(exportsRoot, packageName);
const zipPath = path.join(exportsRoot, `${packageName}.zip`);

function sitePath(relativePath) {
  return path.join(siteRoot, relativePath);
}

function packagePath(relativePath) {
  return path.join(packageRoot, relativePath);
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function patchHtml(html, includeOfflineData) {
  let next = html
    .replace(/styles\.css\?v=[^"]+/g, "styles.css")
    .replace(/app\.js\?v=[^"]+/g, "app.js");

  if (includeOfflineData) {
    next = next.replace(
      /<script src="app\.js" defer><\/script>/,
      '<script src="offline-data.js"></script>\n    <script src="app.js" defer></script>'
    );
  }

  return next;
}

function buildOfflineData(config, dataset) {
  return [
    "window.__DATA_EXPLORER_OFFLINE_CONFIG__ = ",
    JSON.stringify(config, null, 2),
    ";\n\n",
    "window.__DATA_EXPLORER_OFFLINE_DATASET__ = ",
    JSON.stringify(dataset, null, 2),
    ";\n",
  ].join("");
}

function buildReadme(config, dataset) {
  return [
    "Client-Side Data Explorer - Offline Demo",
    "========================================",
    "",
    "This package is a static offline copy of the demo site.",
    "",
    "How to use it:",
    "",
    "1. Extract the ZIP archive.",
    "2. Open index.html directly in a browser.",
    "3. No HTTP server is required.",
    "",
    "The dataset is embedded in offline-data.js so the browser does not need",
    "to fetch JSON files over HTTP. Detail pages such as detail.html?id=...",
    "work from the extracted folder because the same embedded dataset is loaded",
    "by each page.",
    "",
    `Configured title: ${config.title || "Dataset records"}`,
    `Records: ${dataset.length}`,
    "",
    "Notes:",
    "",
    "- This package is a generated artifact.",
    "- Regenerate it with: node scripts/build-offline-package.js",
    "- Do not use it for private, restricted, or sensitive datasets without review.",
    "- External record links still point to online resources and require internet access.",
    "",
  ].join("\n");
}

function makeZip() {
  fs.rmSync(zipPath, { force: true });
  const zip = spawnSync("zip", ["-r", "-X", zipPath, packageName], {
    cwd: exportsRoot,
    stdio: "inherit",
  });

  if (zip.error || zip.status !== 0) {
    throw new Error("Unable to create ZIP archive. Make sure the `zip` command is available.");
  }
}

function build() {
  const config = readJson(sitePath("data/site.config.json"));
  const datasetUrl = config.datasetUrl || "data/dataset.json";
  const dataset = readJson(sitePath(datasetUrl));
  const errors = validateDataset(dataset);

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  fs.rmSync(packageRoot, { recursive: true, force: true });
  fs.mkdirSync(packageRoot, { recursive: true });

  writeText(packagePath("index.html"), patchHtml(fs.readFileSync(sitePath("index.html"), "utf8"), true));
  writeText(packagePath("detail.html"), patchHtml(fs.readFileSync(sitePath("detail.html"), "utf8"), true));
  writeText(packagePath("credits.html"), patchHtml(fs.readFileSync(sitePath("credits.html"), "utf8"), false));
  writeText(packagePath("offline-data.js"), buildOfflineData(config, dataset));
  writeText(packagePath("README-OFFLINE.txt"), buildReadme(config, dataset));

  copyFile(sitePath("app.js"), packagePath("app.js"));
  copyFile(sitePath("styles.css"), packagePath("styles.css"));
  copyFile(path.join(root, "LICENSE"), packagePath("LICENSE"));
  copyFile(path.join(root, "AUTHORS"), packagePath("AUTHORS"));

  makeZip();
  console.log(`Built ${zipPath}`);
}

try {
  build();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
