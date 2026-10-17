import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Home } from "./components/Home.tsx";
import "./styles.css";
import "./illustrations.css";

// This release is a single product homepage.
if (location.pathname !== "/") window.history.replaceState(null, "", "/");
document.title = "Agent Passport: International compliance for AI agents";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <a className="skip-link" href="#main-content">
      Skip to content
    </a>
    <Home />
  </StrictMode>,
);
