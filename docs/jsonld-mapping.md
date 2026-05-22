# JSON-LD Mapping

The JSON-LD export uses Schema.org terms for browser and search-engine interoperability.

| Internal field | JSON-LD field |
| --- | --- |
| `identifier.url` or `id` | `@id` |
| `title` | `name`, `headline` |
| `date` or `year` | `datePublished` |
| `creator[].name` | `author[].name` |
| `source.containerTitle` | `isPartOf.name` |
| `source.volume` | `volumeNumber` |
| `source.issue` | `issueNumber` |
| `source.pages` | `pagination` |
| `identifier.url` | `url` |
| `description` | `description` |

Export with:

```bash
node scripts/convert-internal-to-jsonld.js site/data/dataset.json exports/jsonld/output.json
```
