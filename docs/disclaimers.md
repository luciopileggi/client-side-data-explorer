# Disclaimers

This repository provides a static browser application and small conversion utilities for structured datasets. It does not provide legal, scholarly, archival, bibliographic, or preservation advice.

## Software Scope

`client-side-data-explorer` is a general-purpose static data browser. It does not certify that a dataset is complete, accurate, lawful to publish, suitable for reuse, or compliant with any institutional policy.

Validation scripts check only the local structural requirements needed by the application. Passing validation does not mean that the metadata is factually correct, complete, citable, rights-cleared, or interoperable with external cataloging standards.

## Dataset Responsibility

Anyone publishing a dataset with this software is responsible for verifying:

- copyright status and reuse permissions
- database rights and licensing conditions
- privacy, personal data, and ethical constraints
- provenance, citations, and attribution
- accuracy of titles, dates, creators, identifiers, URLs, and descriptions
- whether source records can be redistributed or only referenced

Do not publish private imports, restricted source registries, unpublished archival notes, credentials, API keys, personal data, or third-party content unless you have confirmed that publication is permitted.

## Example Dataset

The included demo dataset is provided only as an example of the internal JSON format and browser behavior. It should not be treated as an authoritative bibliography, institutional record, preservation copy, or official research output.

The demo dataset may contain metadata converted from a BibTeX source. Conversion is mechanical and may lose nuance, omit fields, normalize names imperfectly, or preserve errors present in the source bibliography.

## AI-Assisted Development

Parts of the implementation, refactoring, documentation, and dataset conversion workflow were produced with AI-assisted coding support. AI-assisted output must be reviewed before publication or reuse.

AI assistance does not replace human review for correctness, security, accessibility, licensing, scholarly accuracy, or editorial responsibility.

## External Links

Dataset records may contain external URLs, DOI links, or other third-party references. Those resources are outside the control of this software. Links may change, disappear, redirect, become paywalled, expose tracking, or display content with different licensing terms.

The presence of an external link does not imply endorsement, permission to reuse the linked content, or verification of the linked page.

## Security

The application intentionally rejects dataset paths supplied through URL query parameters and restricts configured dataset paths to plain relative paths inside the static site.

Do not reintroduce remote configuration URLs, arbitrary local filesystem paths, query-controlled dataset loading, or unchecked user-supplied paths without a separate security review.

## No Warranty

The software is provided under the MIT License, without warranty. See `LICENSE`.
