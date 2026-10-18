import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Home } from "./components/Home.tsx";
import { Demo } from "./components/Demo.tsx";
import "./styles.css";
import "./illustrations.css";

const MarketingPlayground = lazy(() => import("./components/MarketingPlayground.tsx").then(module => ({ default: module.MarketingPlayground })));
const isMarketing = /^\/marketing\/?$/.test(location.pathname);
const isDemo = /^\/demo\/?$/.test(location.pathname);
if (!isDemo && !isMarketing && location.pathname !== "/") window.history.replaceState(null, "", "/");
document.title = isMarketing ? "Marketing checks · Agent Passport" : isDemo ? "Requests · Agent Passport" : "Agent Passport: International compliance for AI agents";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <a className="skip-link" href="#main-content">
      Skip to content
    </a>
    {isMarketing ? <Suspense fallback={<main id="main-content" className="container" role="status" style={{ paddingBlock: 40 }}>Loading marketing checks…</main>}><MarketingPlayground /></Suspense> : isDemo ? <Demo /> : <Home />}
  </StrictMode>,
);
