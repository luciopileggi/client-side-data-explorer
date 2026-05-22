# Local File Mode

The application is designed to run from a static HTTP host. By default it loads:

```text
data/site.config.json
data/dataset.json
```

with `fetch()`.

This is the recommended path for GitHub Pages, Cloudflare Pages, and local testing with:

```bash
python3 -m http.server 8000 -d site
```

## Why Not `fetch("file://...")`

Do not change `datasetUrl` to an absolute `file://` path such as:

```json
{
  "datasetUrl": "file:///Users/name/dataset.json"
}
```

That approach is not portable and is often blocked by browser security rules. Browser behavior differs across Chrome, Safari, Firefox, and local security settings.

It also reintroduces a configuration surface for reading arbitrary local paths. The safer local pattern is to let the user explicitly choose a dataset file.

## Recommended No-Server Variant

Keep the current HTTP `fetch()` path as the default. Add a separate local mode that is activated only when the page is opened with `file://` or when config loading fails.

The local mode should:

- show an explicit "Open dataset JSON" control
- read the selected file with the browser File API
- validate that the parsed value is a dataset array
- keep the dataset in memory for the current page
- avoid query parameters such as `?dataset=...` or `?config=...`

Minimal helper:

```js
function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (error) {
        reject(new Error("Selected file is not valid JSON"));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read selected file"));
    reader.readAsText(file);
  });
}
```

Minimal mode detection:

```js
function isLocalFileMode() {
  return window.location.protocol === "file:";
}
```

The application can then branch during initialization:

```js
async function initIndex() {
  readUrlState();

  if (isLocalFileMode()) {
    renderLocalFileLoader();
    return;
  }

  await loadConfig();
  applySiteConfig();
  state.records = await loadDataset();
  populateControls();
  syncControls();
  renderIndex();
}
```

`renderLocalFileLoader()` should create an `<input type="file" accept="application/json,.json">`, read the selected file with `readJsonFile(file)`, assign the parsed array to `state.records`, and then call the same rendering functions used by the HTTP path.

## Detail View Caveat

The separate `detail.html?id=...` page depends on loading the dataset again. In local file mode, the browser cannot automatically reopen the previously selected local file.

For a simple implementation, keep local details in the index page, for example with an inline detail panel or modal.

For a more complete implementation, store the selected dataset temporarily in `sessionStorage` or `IndexedDB`, then let `detail.html` read it back. This adds complexity and may run into storage limits for large datasets.

## Security Rule

Local file mode should only read files selected by the user through the File API. It should not accept local filesystem paths from config files, query parameters, or text inputs.
