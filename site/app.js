(function () {
  const DEFAULT_CONFIG_URL = "data/site.config.json";
  const DEFAULT_DATASET_URL = "data/dataset.json";
  const PAGE_SIZE = 24;
  const DEFAULT_CONFIG = {
    brand: "Data Explorer",
    title: "Dataset records",
    eyebrow: "Reusable static explorer",
    datasetUrl: DEFAULT_DATASET_URL,
    searchPlaceholder: "Title, author, identifier, source",
    stats: {
      records: "records",
      years: "years",
      sources: "sources",
    },
  };

  const state = {
    config: DEFAULT_CONFIG,
    datasetUrl: DEFAULT_DATASET_URL,
    records: [],
    filtered: [],
    visibleCount: PAGE_SIZE,
    query: "",
    filters: {
      type: "",
      year: "",
      source: "",
      author: "",
    },
    sort: "year-desc",
  };

  const searchCache = new Map();

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return [...(root || document).querySelectorAll(selector)];
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function creatorName(creator) {
    if (!creator) {
      return "";
    }
    return creator.name || [creator.given, creator.family].filter(Boolean).join(" ").trim();
  }

  function creatorNames(record) {
    return Array.isArray(record.creator)
      ? record.creator.map(creatorName).filter(Boolean)
      : [];
  }

  function shortNames(record, limit) {
    const names = creatorNames(record);
    if (!names.length) {
      return "Unknown author";
    }
    if (names.length <= limit) {
      return names.join(", ");
    }
    return `${names.slice(0, limit).join(", ")} et al.`;
  }

  function sourceTitle(record) {
    return record.source && record.source.containerTitle ? record.source.containerTitle : "";
  }

  function detailUrl(record) {
    return `detail.html?id=${encodeURIComponent(record.id)}`;
  }

  function doiUrl(record) {
    const doi = record.identifier && record.identifier.doi ? record.identifier.doi : "";
    return doi ? `https://doi.org/${encodeURIComponent(doi).replace(/%2F/g, "/")}` : "";
  }

  function externalUrl(record) {
    const url = record.identifier && record.identifier.url ? String(record.identifier.url).trim() : "";
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function isSafeRelativePath(value) {
    const path = String(value || "").trim();
    if (!path || path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("?") || path.includes("#")) {
      return false;
    }
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(path)) {
      return false;
    }
    return !path.split("/").some((segment) => segment === "..");
  }

  function searchText(record) {
    if (searchCache.has(record.id)) {
      return searchCache.get(record.id);
    }
    const text = normalize([
      record.id,
      record.title,
      record.alternateTitle,
      record.description,
      record.type,
      record.typeLabel,
      record.year,
      sourceTitle(record),
      record.source && record.source.volume,
      record.source && record.source.issue,
      record.source && record.source.pages,
      record.identifier && record.identifier.doi,
      record.identifier && record.identifier.pmid,
      record.identifier && record.identifier.url,
      record.web && record.web.title,
      record.web && record.web.publisher,
      ...creatorNames(record),
      ...(Array.isArray(record.language) ? record.language : []),
      ...(Array.isArray(record.keywords) ? record.keywords : []),
    ].filter(Boolean).join(" "));
    searchCache.set(record.id, text);
    return text;
  }

  function countBy(records, accessor) {
    const counts = new Map();
    records.forEach((record) => {
      const values = accessor(record);
      const list = Array.isArray(values) ? values : [values];
      list.filter(Boolean).forEach((value) => {
        counts.set(value, (counts.get(value) || 0) + 1);
      });
    });
    return counts;
  }

  function sortCountEntries(counts, mode) {
    const entries = [...counts.entries()].map(([value, count]) => ({
      value: String(value),
      label: String(value),
      count,
    }));
    if (mode === "year") {
      return entries.sort((a, b) => Number(b.value) - Number(a.value));
    }
    return entries.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.label.localeCompare(b.label);
    });
  }

  function setOptions(select, label, entries, currentValue) {
    if (!select) {
      return;
    }
    const current = currentValue || "";
    select.innerHTML = [
      `<option value="">${escapeHtml(label)}</option>`,
      ...entries.map((entry) => {
        const selected = entry.value === current ? " selected" : "";
        return `<option value="${escapeHtml(entry.value)}"${selected}>${escapeHtml(entry.label)} (${entry.count})</option>`;
      }),
    ].join("");
  }

  function populateControls() {
    const typeCounts = countBy(state.records, (record) => record.typeLabel || record.type);
    const yearCounts = countBy(state.records, (record) => record.year || "");
    const sourceCounts = countBy(state.records, sourceTitle);
    const authorCounts = countBy(state.records, creatorNames);

    setOptions($("#typeFilter"), "All types", sortCountEntries(typeCounts), state.filters.type);
    setOptions($("#yearFilter"), "All years", sortCountEntries(yearCounts, "year"), state.filters.year);
    setOptions($("#sourceFilter"), "All sources", sortCountEntries(sourceCounts), state.filters.source);
    setOptions($("#authorFilter"), "All authors", sortCountEntries(authorCounts), state.filters.author);
  }

  function readUrlState() {
    const params = new URLSearchParams(window.location.search);
    state.query = params.get("q") || "";
    state.filters.type = params.get("type") || "";
    state.filters.year = params.get("year") || "";
    state.filters.source = params.get("source") || "";
    state.filters.author = params.get("author") || "";
    state.sort = params.get("sort") || "year-desc";
  }

  function writeUrlState() {
    const params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    if (state.filters.type) params.set("type", state.filters.type);
    if (state.filters.year) params.set("year", state.filters.year);
    if (state.filters.source) params.set("source", state.filters.source);
    if (state.filters.author) params.set("author", state.filters.author);
    if (state.sort !== "year-desc") params.set("sort", state.sort);
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState(null, "", next);
  }

  function syncControls() {
    const searchInput = $("#searchInput");
    const sortSelect = $("#sortSelect");
    if (searchInput) searchInput.value = state.query;
    if (sortSelect) sortSelect.value = state.sort;
    const fields = {
      typeFilter: state.filters.type,
      yearFilter: state.filters.year,
      sourceFilter: state.filters.source,
      authorFilter: state.filters.author,
    };
    Object.entries(fields).forEach(([id, value]) => {
      const select = document.getElementById(id);
      if (select) {
        select.value = value;
      }
    });
  }

  function mergeConfig(config) {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      stats: {
        ...DEFAULT_CONFIG.stats,
        ...(config && config.stats ? config.stats : {}),
      },
    };
  }

  function applySiteConfig() {
    const title = state.config.title || DEFAULT_CONFIG.title;
    const brand = state.config.brand || DEFAULT_CONFIG.brand;
    const eyebrow = state.config.eyebrow || DEFAULT_CONFIG.eyebrow;
    document.title = `${title} - Client-Side Data Explorer`;

    $all("[data-config='brand']").forEach((node) => {
      node.textContent = brand;
    });
    $all("[data-config='title']").forEach((node) => {
      node.textContent = title;
    });
    $all("[data-config='eyebrow']").forEach((node) => {
      node.textContent = eyebrow;
    });
    $all("[data-stat-label]").forEach((node) => {
      const key = node.dataset.statLabel;
      node.textContent = state.config.stats[key] || node.textContent;
    });

    const searchInput = $("#searchInput");
    if (searchInput) {
      searchInput.placeholder = state.config.searchPlaceholder || DEFAULT_CONFIG.searchPlaceholder;
    }

    const backLink = $(".back-link");
    if (backLink) {
      backLink.href = "index.html";
    }
    $all("a[href='index.html']").forEach((link) => {
      link.href = "index.html";
    });
  }

  function compareRecords(a, b) {
    if (state.sort === "year-asc") {
      return (a.year || 0) - (b.year || 0) || a.title.localeCompare(b.title);
    }
    if (state.sort === "title-asc") {
      return a.title.localeCompare(b.title);
    }
    if (state.sort === "source-asc") {
      return sourceTitle(a).localeCompare(sourceTitle(b)) || a.title.localeCompare(b.title);
    }
    return (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title);
  }

  function applyFilters() {
    const query = normalize(state.query);
    state.filtered = state.records
      .filter((record) => {
        if (query && !searchText(record).includes(query)) {
          return false;
        }
        if (state.filters.type && (record.typeLabel || record.type) !== state.filters.type) {
          return false;
        }
        if (state.filters.year && String(record.year || "") !== state.filters.year) {
          return false;
        }
        if (state.filters.source && sourceTitle(record) !== state.filters.source) {
          return false;
        }
        if (state.filters.author && !creatorNames(record).includes(state.filters.author)) {
          return false;
        }
        return true;
      })
      .sort(compareRecords);
  }

  function renderStats() {
    const years = new Set(state.records.map((record) => record.year).filter(Boolean));
    const sources = new Set(state.records.map(sourceTitle).filter(Boolean));
    const statRecords = $("#statRecords");
    const statYears = $("#statYears");
    const statSources = $("#statSources");
    if (statRecords) statRecords.textContent = state.records.length;
    if (statYears) statYears.textContent = years.size;
    if (statSources) statSources.textContent = sources.size;
  }

  function publicationLine(record) {
    const parts = [];
    const source = sourceTitle(record);
    if (source) parts.push(source);
    if (record.source && record.source.volume) {
      const issue = record.source.issue ? `(${record.source.issue})` : "";
      parts.push(`${record.source.volume}${issue}`);
    }
    if (record.source && record.source.pages) parts.push(record.source.pages);
    return parts.join(", ");
  }

  function renderRecord(record) {
    const urlToDetail = detailUrl(record);
    const doi = doiUrl(record);
    const url = externalUrl(record);
    const showUrl = url && url !== doi;
    const pubLine = publicationLine(record);
    const type = record.typeLabel || record.type || "Record";
    const year = record.year || "n.d.";
    return `
      <article class="record-card">
        <div class="record-card-head">
          <div>
            <p class="record-kicker">${escapeHtml(type)}</p>
            <h2><a href="${urlToDetail}">${escapeHtml(record.title)}</a></h2>
          </div>
          <span class="year-pill">${escapeHtml(year)}</span>
        </div>
        <p class="authors">${escapeHtml(shortNames(record, 6))}</p>
        ${pubLine ? `<p class="publication">${escapeHtml(pubLine)}</p>` : ""}
        <div class="record-actions">
          <a class="tool-button subtle" href="${urlToDetail}">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5h16"></path>
              <path d="M4 12h16"></path>
              <path d="M4 19h10"></path>
            </svg>
            Detail
          </a>
          ${doi ? `
            <a class="tool-button subtle" href="${doi}" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"></path>
                <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"></path>
              </svg>
              DOI
            </a>
          ` : ""}
          ${showUrl ? `
            <a class="tool-button subtle" href="${url}" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <path d="M15 3h6v6"></path>
                <path d="M10 14 21 3"></path>
              </svg>
              URL
            </a>
          ` : ""}
        </div>
      </article>
    `;
  }

  function renderResults() {
    const list = $("#recordList");
    const count = $("#resultsCount");
    const empty = $("#emptyState");
    const loadMore = $("#loadMoreButton");
    if (!list || !count || !empty || !loadMore) {
      return;
    }

    const total = state.filtered.length;
    state.visibleCount = Math.min(state.visibleCount, total || PAGE_SIZE);
    const visible = state.filtered.slice(0, state.visibleCount);
    const remaining = Math.max(0, total - state.visibleCount);
    count.textContent = `${total} ${total === 1 ? "record" : "records"}`;
    list.innerHTML = visible.map(renderRecord).join("");
    empty.hidden = total !== 0;
    loadMore.hidden = remaining === 0;
    loadMore.disabled = remaining === 0;
    loadMore.textContent = remaining > 0 ? `Load ${Math.min(PAGE_SIZE, remaining)} more` : "Load more";
  }

  function renderIndex() {
    applyFilters();
    renderStats();
    renderResults();
  }

  function handleFilterChange(event) {
    const target = event.target;
    const map = {
      typeFilter: "type",
      yearFilter: "year",
      sourceFilter: "source",
      authorFilter: "author",
    };
    if (target.id === "searchInput") {
      state.query = target.value.trim();
    } else if (target.id === "sortSelect") {
      state.sort = target.value;
    } else if (map[target.id]) {
      state.filters[map[target.id]] = target.value;
    }
    state.visibleCount = PAGE_SIZE;
    writeUrlState();
    renderIndex();
  }

  function resetFilters() {
    state.query = "";
    state.sort = "year-desc";
    state.filters = {
      type: "",
      year: "",
      source: "",
      author: "",
    };
    state.visibleCount = PAGE_SIZE;
    syncControls();
    writeUrlState();
    renderIndex();
  }

  function toCsl(record) {
    const item = {
      id: record.id,
      type: record.type || "item",
      title: record.title,
    };
    const authors = Array.isArray(record.creator) ? record.creator : [];
    if (authors.length) {
      item.author = authors.map((creator) => {
        if (creator.family || creator.given) {
          return {
            family: creator.family || "",
            given: creator.given || "",
          };
        }
        return { literal: creator.name || "" };
      });
    }
    if (record.year) {
      const parts = String(record.date || record.year).split("-").map(Number).filter(Boolean);
      item.issued = { "date-parts": [parts.length ? parts : [record.year]] };
    }
    if (record.source && record.source.containerTitle) item["container-title"] = record.source.containerTitle;
    if (record.source && record.source.volume) item.volume = record.source.volume;
    if (record.source && record.source.issue) item.issue = record.source.issue;
    if (record.source && record.source.pages) item.page = record.source.pages;
    if (record.identifier && record.identifier.doi) item.DOI = record.identifier.doi;
    if (record.identifier && record.identifier.pmid) item.PMID = record.identifier.pmid;
    return item;
  }

  function toJsonLd(record) {
    const url = externalUrl(record) || doiUrl(record);
    return {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      "@id": url || record.id,
      identifier: record.id,
      name: record.title,
      headline: record.title,
      datePublished: record.date || (record.year ? String(record.year) : undefined),
      author: creatorNames(record).map((name) => ({ "@type": "Person", name })),
      isPartOf: sourceTitle(record) ? { "@type": "Periodical", name: sourceTitle(record) } : undefined,
      volumeNumber: record.source && record.source.volume ? record.source.volume : undefined,
      issueNumber: record.source && record.source.issue ? record.source.issue : undefined,
      pagination: record.source && record.source.pages ? record.source.pages : undefined,
      url: url || undefined,
      description: record.description || undefined,
    };
  }

  function cleanJson(value) {
    if (Array.isArray(value)) {
      return value.map(cleanJson);
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([, item]) => item !== undefined && item !== "")
          .map(([key, item]) => [key, cleanJson(item)])
      );
    }
    return value;
  }

  function download(filename, value, type) {
    const blob = new Blob([value], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  function exportRecords(format, records) {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "csl") {
      download(`records-${stamp}.csl.json`, `${JSON.stringify(records.map(toCsl), null, 2)}\n`, "application/json");
      return;
    }
    if (format === "jsonld") {
      download(`records-${stamp}.jsonld`, `${JSON.stringify(cleanJson(records.map(toJsonLd)), null, 2)}\n`, "application/ld+json");
      return;
    }
    download(`records-${stamp}.json`, `${JSON.stringify(records, null, 2)}\n`, "application/json");
  }

  function citation(record) {
    const authors = shortNames(record, 8);
    const year = record.year || "n.d.";
    const pub = publicationLine(record);
    const doi = doiUrl(record);
    return [
      `${authors} (${year}). ${record.title}.`,
      pub ? `${pub}.` : "",
      doi,
    ].filter(Boolean).join(" ");
  }

  function renderDetail(record) {
    const view = $("#detailView");
    if (!view) {
      return;
    }
    if (!record) {
      view.innerHTML = `
        <div class="empty-state">
          <h1>Record not found</h1>
          <p>The requested identifier is not present in the dataset.</p>
        </div>
      `;
      return;
    }

    const pubLine = publicationLine(record);
    const doi = doiUrl(record);
    const url = externalUrl(record);
    const showUrl = url && url !== doi;
    const facts = [
      ["Type", record.typeLabel || record.type],
      ["Web title", record.alternateTitle || ""],
      ["Year", record.year || ""],
      ["Date", record.date || ""],
      ["Source", sourceTitle(record)],
      ["Volume", record.source && record.source.volume],
      ["Issue", record.source && record.source.issue],
      ["Pages", record.source && record.source.pages],
      ["DOI", record.identifier && record.identifier.doi],
      ["PMID", record.identifier && record.identifier.pmid],
      ["URL", url],
      ["Final URL", record.identifier && record.identifier.finalUrl && record.identifier.finalUrl !== url ? record.identifier.finalUrl : ""],
      ["URL status", record.identifier && record.identifier.urlStatus],
      ["Content type", record.identifier && record.identifier.contentType],
      ["ID", record.id],
    ].filter(([, value]) => value);

    view.innerHTML = `
      <header class="detail-header">
        <p class="record-kicker">${escapeHtml(record.typeLabel || record.type || "Record")}</p>
        <h1>${escapeHtml(record.title)}</h1>
        <p class="authors detail-authors">${escapeHtml(creatorNames(record).join(", ") || "Unknown author")}</p>
        ${pubLine ? `<p class="publication">${escapeHtml(pubLine)}</p>` : ""}
        <div class="button-group detail-actions">
          ${doi ? `
            <a class="tool-button" href="${doi}" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"></path>
                <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"></path>
              </svg>
              DOI
            </a>
          ` : ""}
          ${showUrl ? `
            <a class="tool-button" href="${url}" target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <path d="M15 3h6v6"></path>
                <path d="M10 14 21 3"></path>
              </svg>
              URL
            </a>
          ` : ""}
          <button class="tool-button" type="button" id="copyCitationButton">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Citation
          </button>
          <button class="tool-button" type="button" id="exportRecordButton">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12"></path>
              <path d="m7 10 5 5 5-5"></path>
              <path d="M5 21h14"></path>
            </svg>
            JSON
          </button>
        </div>
      </header>

      <dl class="detail-grid">
        ${facts.map(([label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${(label === "URL" || label === "Final URL") && /^https?:\/\//i.test(String(value))
              ? `<a href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(value)}</a>`
              : escapeHtml(value)}</dd>
          </div>
        `).join("")}
      </dl>

      <section class="citation-block">
        <h2>Citation</h2>
        <p id="citationText">${escapeHtml(citation(record))}</p>
      </section>

      <details class="raw-record">
        <summary>Internal JSON</summary>
        <pre>${escapeHtml(JSON.stringify(record, null, 2))}</pre>
      </details>
    `;

    const copyButton = $("#copyCitationButton");
    const exportButton = $("#exportRecordButton");
    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        const text = citation(record);
        try {
          await navigator.clipboard.writeText(text);
          copyButton.textContent = "Copied";
        } catch (error) {
          window.prompt("Citation", text);
        }
      });
    }
    if (exportButton) {
      exportButton.addEventListener("click", () => exportRecords("json", [record]));
    }
  }

  async function loadConfig() {
    const response = await fetch(DEFAULT_CONFIG_URL, { cache: "no-store" });
    if (!response.ok) {
      state.config = DEFAULT_CONFIG;
      state.datasetUrl = DEFAULT_CONFIG.datasetUrl;
      return;
    }
    state.config = mergeConfig(await response.json());
    if (!isSafeRelativePath(state.config.datasetUrl)) {
      throw new Error("Unsafe datasetUrl in data/site.config.json");
    }
    state.datasetUrl = state.config.datasetUrl || DEFAULT_DATASET_URL;
  }

  async function loadDataset() {
    const response = await fetch(state.datasetUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Dataset request failed: ${response.status}`);
    }
    return response.json();
  }

  async function initIndex() {
    readUrlState();
    await loadConfig();
    applySiteConfig();
    state.records = await loadDataset();
    populateControls();
    syncControls();
    renderIndex();

    $("#searchInput").addEventListener("input", handleFilterChange);
    $("#sortSelect").addEventListener("change", handleFilterChange);
    ["typeFilter", "yearFilter", "sourceFilter", "authorFilter"].forEach((id) => {
      document.getElementById(id).addEventListener("change", handleFilterChange);
    });
    $("#resetButton").addEventListener("click", resetFilters);
    $("#loadMoreButton").addEventListener("click", () => {
      state.visibleCount = Math.min(state.visibleCount + PAGE_SIZE, state.filtered.length);
      renderResults();
    });
    $all("[data-export]").forEach((button) => {
      button.addEventListener("click", () => exportRecords(button.dataset.export, state.filtered));
    });
  }

  async function initDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    readUrlState();
    await loadConfig();
    applySiteConfig();
    state.records = await loadDataset();
    renderDetail(state.records.find((record) => record.id === id));
  }

  async function init() {
    const page = document.body.dataset.page;
    try {
      if (page === "index") {
        await initIndex();
      } else if (page === "detail") {
        await initDetail();
      }
    } catch (error) {
      const target = $("#recordList") || $("#detailView") || document.body;
      target.innerHTML = `
        <div class="empty-state">
          <h1>Unable to load dataset</h1>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
}());
