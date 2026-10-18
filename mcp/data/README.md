# Bundled U.S. Consolidated Screening List

`consolidated-screening-list.json` contains the complete public CSL snapshot, with all upstream records and fields retained. Its companion `.meta.json` records the snapshot generation date and record/source counts. The JSON is imported into the server build, so screening works without a network connection or separate runtime asset files.

Source: [Trade.gov CSL guidance](https://www.trade.gov/consolidated-screening-list) and its [official JSON download](https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json).

The companion `.meta.json` records the original download time, upstream Last-Modified, record/source counts, SHA-256 of the committed canonical JSON, and SHA-256 of the original download bytes. Canonical JSON is `JSON.stringify(dataset)` followed by a newline; all upstream fields and records are retained.

This is a dated snapshot. Each result reports its generation date, original retrieval time, age, and `RECENT`/`STALE` freshness. More than 48 hours since generation or any source import marks it `STALE`; historical matching still works and the result requires review. No live lookup is performed.

To replace the snapshot, from `mcp/`:

```bash
npm run refresh:screening-list
npm run typecheck
npm run build
```

Commit both JSON files together and redeploy when ready. The refresh command is the only screening-related step that needs outbound HTTPS; tool calls do not. Original agency restrictions and wider transaction compliance still require review.
