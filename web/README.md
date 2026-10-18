# Agent Passport web app

A simple React + TypeScript homepage with exactly three sections and no navigation bar:

1. **Tool overview:** international compliance for autonomous AI agents and the MCP connection. Two equally styled buttons link to the use cases. A compact purchase flow shows food import requirements being flagged and the agent holding the order while gathering filing details for a recheck.
2. **Import and export:** the default illustration follows a packaged coffee order from the Dominican Republic to a US store. The missing FDA prior notice confirmation is flagged, the agent gets instructions for arranging the filing, and the order is held. The export tab shows technical details needed before a controller shipment to Germany. Each example links to official guidance.
3. **Marketing:** a promotional email to customers in Canada is held because its unsubscribe option and proof of consent are missing. The agent receives specific corrections and rechecks before sending. The example links to CRTC guidance.

Each use-case section has a general overview followed by a written example directly below it, with a supporting illustration alongside.

The wordmark sits within the overview, with an outlined, pill-shaped **History** button at the top right linking to the requests page at `/demo`. The homepage has no separate navigation, developer section, FAQ, playback, or extra footer section.

## Run locally

Requires Node.js 22.22.2 or later and npm. From the repository root:

```bash
cd web
npm ci
npm run dev -- --port 5173
```

Open **http://127.0.0.1:5173/**. Keep the terminal running; stop with **Ctrl+C**. If the port is occupied, use `npm run dev -- --port 5174` and open the printed Local URL.

The homepage needs no environment variables, API keys, InsForge connection, or running MCP server. Fonts and SVG assets are bundled locally. The existing MCP app remains independent in `../mcp/`. The `/demo` page needs a server-side Manufact connection as described below.

## Request-history demo

Open **http://127.0.0.1:5173/demo** (or the port printed by Vite). It reads real captured requests from the existing Manufact gateway; it does not generate examples or execute business actions.

Create `web/.env.local` from `web/.env.example` and configure:

```dotenv
MANUFACT_API_KEY=<your Manufact API key>
MANUFACT_SERVER_ID=ff38bb29-7976-4069-84af-c3c190735e2d
```

These are **server-only** values. Never use `VITE_` prefixes for credentials. Restart Vite after changing them. The Vite development and preview servers provide the same `/api/requests` handler as the production Vercel Function in `api/requests.ts`.

Server modules use `.js` import specifiers so Vercel’s emitted Node.js modules resolve correctly. Vite resolves these imports to the TypeScript source during local development.

- Show at most the **latest 10 import/export requests and latest 10 marketing requests** with captured inputs and readable results. The **Requests** demo switches only between **Import & export** and **Marketing**. It has no all-requests view, counts, summary cards, gateway status, refresh button, or advanced filters. It uses the latest seven days of retained activity.
- Open a request to read the original action, assessment, policy pack/version, routing explanation, requirements, source links, and next steps.
- Auto-refresh replaces the feed every 20 seconds while the tab is visible; there is no older-history pagination.
- The API scans gateway pages newest first until both categories have 10 requests with captured details or retained history ends. Scans are bounded to 10 pages of 100 events and 12 seconds; the API reports whether the scan limit was reached. Other protocol traffic and calls without captured inputs or readable results are excluded before applying the category limit.
- A successful HTTP/tool call is separate from the compliance outcome. Budget limits are shown as caller constraints, and the UI does not claim a purchase or email was executed.
- Historical `purchase` responses and text/SSE captures are supported. Calls without captured details are hidden. Missing routing, general policy fallbacks, and captured tool errors remain explicit in the request details. Old results are never recomputed using today’s policy rules.

Manufact’s [gateway events API](https://manufact.com/openapi.json) is read with a bearer token on the server. [Payload capture](https://docs.manufact.com/dashboard/observability) must have been enabled when a request happened to recover its inputs and outputs. Metadata-only history cannot be reconstructed. History retention is controlled by the Manufact plan. The endpoint returns a projection of compliance fields; it excludes gateway headers, IP addresses, actor IDs, and raw request/response bodies.

## What to test

1. Confirm there are three sections: overview, import/export, and marketing. The top has a wordmark and no navigation bar or coverage notes.
2. Confirm **Import & export** and **Marketing** have matching button styles and follow them to their sections.
3. Read the overview illustration: the agent holds the food order, gathers filing details, and rechecks before buying.
4. Switch **Import example / Export example**. The import example shows coffee from the Dominican Republic to the US, explains the FDA prior notice requirement before arrival, and tells the agent to arrange the filing and return the confirmation. The export example flags missing technical details and keeps the shipment held pending review. Source links change with the example.
5. Confirm the marketing example explains what the agent was asked to send, why Canada’s rules flag the missing unsubscribe option, and how to resolve both that and missing consent evidence before rechecking. The send stays on hold.
6. At a 375 px width, check readable text, stacked layouts, trade-example buttons, status labels, and no horizontal page overflow.
7. Use Tab and Enter/Space to operate the section links and example buttons. Check reduced-motion preferences.

All examples are synthetic and illustrative. This homepage runs no compliance checks and performs no business actions.

The food and marketing requirements shown here are presentation examples. They do not expand the current MCP server’s coverage.

## Check and build

From `web/`:

```bash
npm run typecheck
npm run build
npm run preview -- --port 4173
```

Open **http://127.0.0.1:4173/** to inspect the production bundle. The build includes TypeScript checking and writes to `web/dist/`.

## Deploy with InsForge

Live website: [Agent Passport](https://vubsb6rq.insforge.site/).

From the repository root, with the existing InsForge project linked:

```bash
npm --prefix web run build
npx -y @insforge/cli deployments deploy ./web
```

Deploy the `web/` source directory. InsForge builds the Vite app using `web/vercel.json` and returns the hosted URL. The homepage needs no environment variables or backend credentials. To publish the demo with live history, configure `MANUFACT_API_KEY` and `MANUFACT_SERVER_ID` as server environment variables on the deployment; local `.env` files are excluded from uploads. The `/api/requests` Vercel Function must be deployed alongside the static app. A static-only host can serve the homepage but cannot query Manufact securely.

## Code map

- `src/components/Demo.tsx` and `src/demo.css`: request feed, category tabs, and expandable details.
- `server/normalize.ts`: captured gateway payloads to readable compliance records.
- `server/requests-handler.ts` and `api/requests.ts`: bounded, server-side Manufact reads.
- `vite.config.ts`: local API middleware for development and production preview.
- `src/components/Home.tsx`: the three sections and illustrative import/export switch.
- `src/components/Illustrations.tsx`: static purchase follow-up and campaign compliance illustrations.
- `src/components/ui.tsx`: wordmark, icons, and status labels.
- `src/styles.css`: responsive styles, bundled fonts, and reduced motion.
- `src/illustrations.css`: readable, responsive illustration layouts and trade requirement panels.
- `vercel.json`: frontend build settings and single-page routing for InsForge hosting.
