import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Home } from "./components/Home.tsx";
import { Demo } from "./components/Demo.tsx";
import "./styles.css";
import "./illustrations.css";

const isDemo = /^\/demo\/?$/.test(location.pathname);
if (!isDemo && location.pathname !== "/") window.history.replaceState(null, "", "/");
document.title = isDemo ? "Requests · Agent Passport" : "Agent Passport: International compliance for AI agents";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <a className="skip-link" href="#main-content">
      Skip to content
    </a>
    {isDemo ? <Demo /> : <Home />}
  </StrictMode>,
);
