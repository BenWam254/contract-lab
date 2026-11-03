# Contract Lab

Validate JSON payloads against JSON Schema subsets and diff API contracts for breaking changes, entirely in your browser.

**Live demo:** https://contract-lab-chi.vercel.app/

![Contract Lab dashboard](./docs/screenshot.png)

## Features

- **Payload validation** against a JSON Schema subset, with three unknown-field policies: `reject`, `drop` and `allow`.
- **Contract diff** between two schema versions, with every change classified as breaking or non-breaking.
- **Shareable state:** contract, new contract, payload and policy are encoded into the URL, so a link reproduces the exact session.
- **Large payloads stay smooth:** validation and diffing run in a Web Worker, so the interface never blocks.
- **Private by design:** nothing is uploaded. Everything runs client-side.

## How it works

The core logic (parsing, validation, diffing and share-state encoding) is pure TypeScript with no runtime dependencies, covered by unit tests. The UI sends each job to a Web Worker through a small typed message protocol. Inputs are debounced, results are tagged with a request id so stale responses are dropped, and a superseded job is cancelled by terminating its worker. Rendered rows are capped so a result with thousands of violations cannot freeze the page.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · Vitest

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests
```

## Design

A "Modern Noir" system: obsidian surfaces, flat sharp-cornered layout, and gold, sky blue, pink and purple accents used sparingly for status and emphasis.