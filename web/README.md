# Agent Passport homepage

A simple React + TypeScript homepage with exactly three sections and no navigation bar:

1. **Tool overview:** international compliance for autonomous AI agents and the MCP connection. Two equally styled buttons link to the use cases. A compact purchase flow shows food import requirements being flagged and the agent holding the order while gathering filing details for a recheck.
2. **Import and export:** the default illustration follows a packaged coffee order from the Dominican Republic to a US store. The missing FDA prior notice confirmation is flagged, the agent gets instructions for arranging the filing, and the order is held. The export tab shows technical details needed before a controller shipment to Germany. Each example links to official guidance.
3. **Marketing:** a promotional email to customers in Canada is held because its unsubscribe option and proof of consent are missing. The agent receives specific corrections and rechecks before sending. The example links to CRTC guidance.

Each use-case section has a general overview followed by a written example directly below it, with a supporting illustration alongside.

The wordmark sits within the overview. There is no separate navigation, developer section, FAQ, demo, playback, or extra footer section.

## Run locally

Requires Node.js 22.22.2 or later and npm. From the repository root:

```bash
cd web
npm ci
npm run dev -- --port 5173
```

Open **http://127.0.0.1:5173/**. Keep the terminal running; stop with **Ctrl+C**. If the port is occupied, use `npm run dev -- --port 5174` and open the printed Local URL.

No environment variables, API keys, InsForge connection, or running MCP server are needed. Fonts and SVG assets are bundled locally. The existing MCP app remains independent in `../mcp/`.

## What to test

1. Confirm there are three sections: overview, import/export, and marketing. The top has a wordmark and no navigation bar. The final page note identifies implemented coverage.
2. Confirm **Import & export** and **Marketing** have matching button styles and follow them to their sections.
3. Read the overview illustration: the agent holds the food order, gathers filing details, and rechecks before buying.
4. Switch **Import example / Export example**. The import example shows coffee from the Dominican Republic to the US, explains the FDA prior notice requirement before arrival, and tells the agent to arrange the filing and return the confirmation. The export example flags missing technical details and keeps the shipment held pending review. Source links change with the example.
5. Confirm the marketing example explains what the agent was asked to send, why Canada’s rules flag the missing unsubscribe option, and how to resolve both that and missing consent evidence before rechecking. The send stays on hold.
6. At a 375 px width, check readable text, stacked layouts, trade-example buttons, status labels, and no horizontal page overflow.
7. Use Tab and Enter/Space to operate the section links and example buttons. Check reduced-motion preferences.

All examples are synthetic and illustrative. This homepage runs no compliance checks and performs no business actions.

The MCP server implements selected FDA prior-notice checks for commercial packaged roasted coffee arriving by air/sea, Singapore chewing-gum restrictions, and India's electronic-cigarette prohibition. Export and marketing examples remain illustrative review workflows. The page note describes this coverage; the homepage itself makes no tool calls.

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

Deploy the `web/` source directory. InsForge builds the Vite app using `web/vercel.json` and returns the hosted URL. The homepage needs no environment variables or backend credentials.

## Code map

- `src/components/Home.tsx`: the three sections and illustrative import/export switch.
- `src/components/Illustrations.tsx`: static purchase follow-up and campaign compliance illustrations.
- `src/components/ui.tsx`: wordmark, icons, and status labels.
- `src/styles.css`: responsive styles, bundled fonts, and reduced motion.
- `src/illustrations.css`: readable, responsive illustration layouts and trade requirement panels.
- `vercel.json`: frontend build settings and single-page routing for InsForge hosting.
