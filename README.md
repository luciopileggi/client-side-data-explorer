# Client-Side Data Explorer

A lightweight static web application for browsing, filtering, and searching structured JSON datasets entirely in the browser.

No backend and no build step. The repository includes one optional example dataset generated from a BibTeX bibliography.

## What This Repository Contains

```text
.
├── site/
│   ├── index.html
│   ├── detail.html
│   ├── credits.html
│   ├── styles.css
│   ├── app.js
│   └── data/
│       ├── research-support.dataset.json
│       ├── schema.json
│       └── site.config.json
├── scripts/
│   ├── check-site.js
│   ├── convert-internal-to-jsonld.js
│   ├── convert-internal-to-csljson.js
│   ├── convert-internal-to-tei.js
│   ├── convert-csljson-to-internal.js
│   ├── convert-bibtex-to-internal.js
│   ├── convert-tei-to-internal.js
│   ├── validate.js
│   └── utils.js
├── docs/
├── exports/
├── AUTHORS
└── LICENSE
```

`site/` is the static application. It is the directory to publish with GitHub Pages, Cloudflare Pages, or any static host.

The active demo dataset is `site/data/research-support.dataset.json`. Add your own public dataset as `site/data/dataset.json` when you are ready to publish different content.

The same file can be replaced or kept as a reference example for the internal dataset format.

## Local Use

Create or copy a dataset into:

```text
site/data/dataset.json
```

Then serve the site:

```bash
python3 -m http.server 8000 -d site
```

Open:

```text
http://localhost:8000
```

The active dataset path is configured in `site/data/site.config.json`:

```json
{
  "datasetUrl": "data/research-support.dataset.json"
}
```

For safety, `datasetUrl` must be a plain relative path inside the site. Absolute URLs, protocol URLs, root-relative paths, query strings, fragments, and `..` path traversal are rejected.

Opening `site/index.html` directly with `file://` is not supported by default because browsers often block `fetch()` for local JSON files. See `docs/local-file-mode.md` for an optional File API approach if you want a no-server local variant.

## Checks

Check the code-only repository structure:

```bash
node scripts/check-site.js
```

Check a publishable site, requiring the configured dataset to exist and validate:

```bash
node scripts/check-site.js --require-dataset
```

Validate a dataset directly:

```bash
node scripts/validate.js site/data/dataset.json
```

Convert a BibTeX bibliography into the internal dataset format:

```bash
node scripts/convert-bibtex-to-internal.js input.bib site/data/research-support.dataset.json
```

## Publication

For Cloudflare Pages:

```text
Build command: node scripts/check-site.js --require-dataset
Output directory: site
```

For GitHub Pages, publish the `site/` directory with GitHub Actions, or copy its contents to the branch used by Pages. Keep private imports, source registries, and local exports outside `site/`.

## Disclaimers

Read `docs/disclaimers.md` before publishing a public dataset. The short version: this repository provides software and example data handling only; dataset publishers remain responsible for rights, accuracy, privacy, attribution, and review of generated or converted metadata.

Security notice: this software is provided as-is and has not undergone a professional security audit. Do not publish secrets, credentials, private datasets, personal data, restricted archival notes, or sensitive deployment details in this repository or in datasets. Anyone deploying or forking this project is responsible for reviewing hosting settings, dataset contents, browser security behavior, access controls, and any local changes before publication.

## Dataset Format

The app uses a canonical internal JSON format. See `site/data/schema.json` and `docs/data-model.md`.

Minimal record:

```json
[
  {
    "id": "record-001",
    "title": "Example record",
    "creator": [{ "name": "Unknown", "role": "author" }],
    "year": null,
    "date": "",
    "language": [],
    "type": "item",
    "typeLabel": "Item",
    "description": "",
    "identifier": {
      "url": ""
    },
    "keywords": []
  }
]
```

## Credits

- Software created by Lucio Pileggi
- Developed with AI-assisted coding support for implementation, refactoring, and documentation
- Dublin Core Metadata Initiative
- Text Encoding Initiative (TEI)
- DataCite

## License

MIT License. See `LICENSE`.
