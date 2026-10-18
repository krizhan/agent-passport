import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Home } from "./components/Home.tsx";
import { Demo } from "./components/Demo.tsx";
import "./styles.css";
import "./illustrations.css";

const TradeScenarios = lazy(() => import("./components/TradeScenarios.tsx").then(module => ({ default: module.TradeScenarios })));

const isDemo = /^\/demo\/?$/.test(location.pathname);
const isScenarios = /^\/scenarios\/?$/.test(location.pathname);
if (!isDemo && !isScenarios && location.pathname !== "/") window.history.replaceState(null, "", "/");
document.title = isScenarios ? "Trade scenarios · Agent Passport" : isDemo ? "Requests · Agent Passport" : "Agent Passport: Compliance for AI agents";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <a className="skip-link" href="#main-content">
      Skip to content
    </a>
    {isScenarios ? <Suspense fallback={<main className="container" id="main-content" role="status" style={{ paddingBlock: 40 }}>Loading trade scenarios…</main>}><TradeScenarios /></Suspense> : isDemo ? <Demo /> : <Home />}
  </StrictMode>,
);
