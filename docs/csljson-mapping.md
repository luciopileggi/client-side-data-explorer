# CSL-JSON Mapping

The import script `scripts/convert-csljson-to-internal.js` maps CSL-JSON into the canonical internal model.

| CSL-JSON field | Internal field |
| --- | --- |
| `id` | `id` |
| `title` | `title` |
| `author[].given`, `author[].family`, `author[].literal` | `creator[]` |
| `issued.date-parts[0]` | `year`, `date` |
| `type` | `type`, `typeLabel` |
| `container-title` | `source.containerTitle` |
| `volume` | `source.volume` |
| `issue` | `source.issue` |
| `page` | `source.pages` |
| `DOI` | `identifier.doi`, `identifier.url` |
| `PMID` | `identifier.pmid` |

CSL-JSON is also available as an export target through `scripts/convert-internal-to-csljson.js` and the browser export buttons.
