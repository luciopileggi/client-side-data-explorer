# Data Model

The browser application reads the dataset configured in `site/data/site.config.json`. This internal JSON array is the canonical dataset used for filtering, detail views, and browser exports.

## Record

Required fields:

- `id`: stable record identifier.
- `title`: display title.
- `creator`: array of people or organizations.
- `type`: normalized source type, usually copied from CSL-JSON.
- `language`: array of language tags. It may be empty when the import source has no language metadata.

Common optional fields:

- `typeLabel`: human-readable type label.
- `year`: integer publication year or `null`.
- `date`: ISO-like date string when available.
- `description`: short summary for search and display.
- `identifier.doi`: DOI without the `https://doi.org/` prefix.
- `identifier.pmid`: PubMed identifier.
- `identifier.url`: canonical external URL.
- `source.containerTitle`: journal, book, collection, or website title.
- `source.volume`, `source.issue`, `source.pages`: publication details.
- `keywords`: controlled or imported keywords.

## Example

```json
{
  "id": "demo-ms-001",
  "title": "Demo Book of Hours Fragment",
  "creator": [
    {
      "name": "Unknown scribe",
      "role": "scribe"
    }
  ],
  "year": 1450,
  "date": "circa 1450",
  "language": ["lat"],
  "type": "manuscript",
  "typeLabel": "Manuscript",
  "identifier": {
    "url": "https://example.org/demo-ms-001"
  },
  "source": {
    "containerTitle": "Demo Manuscript Collection",
    "pages": "fols. 1r-2v",
    "archive": "Example Library",
    "archiveLocation": "MS Demo 1"
  }
}
```
