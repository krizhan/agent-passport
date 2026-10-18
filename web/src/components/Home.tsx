import { useState } from "react";
import { ExampleLabel, Icon, Logo, SectionLabel } from "./ui.tsx";
import { CampaignCompliance, RestrictedPartyScreening, PurchaseFlow } from "./Illustrations.tsx";

const tradeExamples = {
  import: {
    title: "Order packaged coffee for our US store.",
    route: [
      ["Ships from", "Dominican Republic"],
      ["Destination", "United States"],
    ],
    required: {
      title: "Food import filing not confirmed",
      description:
        "This coffee is a food product. FDA must receive prior notice before the shipment arrives in the US.",
      nextStep:
        "Ask the importer or broker to arrange the filing, then return the confirmation for another check.",
      hold: "Agent holds the order",
    },
    source: {
      label: "FDA food import guidance",
      url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-what-you-need-know-about-prior-notice-imported-food-shipments",
    },
  },
  export: {
    title: "Ship an industrial controller to Germany.",
    route: [
      ["Ships from", "United States"],
      ["Destination", "Germany"],
    ],
    required: {
      title: "Export requirements not established",
      description:
        "The controller’s technical details are needed to determine which export rules apply.",
      nextStep:
        "Get the specifications for specialist review of the product, recipient and intended use, then recheck before shipping.",
      hold: "Agent holds the shipment",
    },
    source: {
      label: "BIS export classification guidance",
      url: "https://www.bis.gov/licensing/classify-your-item",
    },
  },
};

export function Home() {
  const [tradeMode, setTradeMode] = useState<"import" | "export">("import");
  const trade = tradeExamples[tradeMode];

  return (
    <main id="main-content">
      <section
        className="overview container"
        id="overview"
        aria-labelledby="overview-title"
      >
        <div className="brand-line">
          <Logo />
          <a className="button button-demo" href="/demo">
            History
            <Icon name="arrow" size={15} />
          </a>
        </div>
        <div className="overview-layout">
          <div className="overview-copy">
            <div className="eyebrow">
              <span />
              LOCAL AND INTERNATIONAL COMPLIANCE FOR AI AGENTS
            </div>
            <h1 id="overview-title">
              Give your agents a compliant <span>path wherever they act.</span>
            </h1>
            <p className="overview-description">
              Agent Passport helps autonomous AI agents check local and
              international laws and regulations before they act. It explains
              what’s allowed and what the agent needs to resolve.
            </p>
            <p className="integration-line">
              Agents connect through MCP and carry out actions using their
              existing tools.
            </p>
            <div className="overview-links">
              <a className="button button-blue" href="#import-export">
                Import & export
                <Icon name="arrow" size={17} />
              </a>
              <a className="button button-blue" href="#marketing">
                Marketing
                <Icon name="arrow" size={17} />
              </a>
              <a className="button button-blue" href="#restricted-party-screening">
                Restricted-party screening
                <Icon name="arrow" size={17} />
              </a>
            </div>
          </div>
          <PurchaseFlow />
        </div>
      </section>

      <section
        className="trade-section"
        id="import-export"
        aria-labelledby="trade-title"
      >
        <div className="container use-case-layout">
          <div className="use-case-copy">
            <SectionLabel number="01">IMPORT & EXPORT</SectionLabel>
            <h2 id="trade-title">
              Check import and export <span>requirements.</span>
            </h2>
            <p>
              Your agent checks a purchase or shipment for restrictions and gets
              instructions for missing documents or required reviews.
            </p>
            <p><a className="source-link" href="/scenarios">Explore trade scenarios <Icon name="arrow" size={15} /></a></p>
            <p>
              <strong>Example:</strong> You ask your agent to import coffee from
              the Dominican Republic for a US store. Agent Passport flags the
              missing FDA prior notice filing and gives next steps, so the agent
              holds the order while it resolves the requirement.
            </p>
          </div>
          <div className="trade-example">
            <div
              className="example-tabs"
              role="group"
              aria-label="Import or export illustration"
            >
              <button
                aria-pressed={tradeMode === "import"}
                className={tradeMode === "import" ? "active" : ""}
                onClick={() => setTradeMode("import")}
              >
                <Icon name="briefcase" size={16} />
                Import example
              </button>
              <button
                aria-pressed={tradeMode === "export"}
                className={tradeMode === "export" ? "active" : ""}
                onClick={() => setTradeMode("export")}
              >
                <Icon name="globe" size={16} />
                Export example
              </button>
            </div>
            <div className="trade-example-content" aria-live="polite">
              <h3>{trade.title}</h3>
              <div className="route-strip">
                {trade.route.map(([label, value], index) => (
                  <div className="route-stop" key={label}>
                    {index > 0 && <Icon name="arrow" size={13} />}
                    <span>
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </span>
                  </div>
                ))}
              </div>
              <div className="trade-required">
                <small>AGENT PASSPORT FLAGS</small>
                <h4>{trade.required.title}</h4>
                <p>{trade.required.description}</p>
                <div className="trade-next-step">
                  <strong>Agent’s next step</strong>
                  <p>{trade.required.nextStep}</p>
                </div>
                <div className="trade-hold">
                  <Icon name="clock" size={15} />
                  {trade.required.hold}
                </div>
              </div>
            </div>
            <div className="example-footer">
              <ExampleLabel />
              <a
                className="source-link"
                href={trade.source.url}
                target="_blank"
                rel="noreferrer"
              >
                {trade.source.label}
                <Icon name="arrow" size={13} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        className="marketing-section container"
        id="marketing"
        aria-labelledby="marketing-title"
      >
        <div className="use-case-layout marketing-layout">
          <div className="use-case-copy">
            <SectionLabel number="02">MARKETING</SectionLabel>
            <h2 id="marketing-title">
              Check campaign compliance <span>before sending.</span>
            </h2>
            <p>
              Your agent submits a rendered email and recipient evidence for
              US, Canadian and UK policy checks, then resolves missing details
              and rechecks the revised message.
            </p>
            <p>
              <strong>Example:</strong> You ask your agent to send a promotion
              to customers in Canada. Agent Passport flags the missing
              unsubscribe option and consent records, so the agent fixes the
              campaign and rechecks before sending.
            </p>
          </div>
          <CampaignCompliance />
        </div>
      </section>

      <section
        className="screening-section container"
        id="restricted-party-screening"
        aria-labelledby="screening-title"
      >
        <div className="use-case-layout screening-layout">
          <div className="use-case-copy">
            <SectionLabel number="03">RESTRICTED-PARTY SCREENING</SectionLabel>
            <h2 id="screening-title">
              Screen counterparties <span>before acting.</span>
            </h2>
            <p>
              Your agent checks a person or organization against a dated U.S.
              Consolidated Screening List snapshot and receives possible matches,
              source links, and next steps for review.
            </p>
            <p>
              <strong>Example:</strong> You ask your agent to place an order
              with an overseas supplier. A similar listed name is flagged,
              so the agent holds the order while a reviewer checks the identity
              and applicable restrictions. No candidates does not clear the transaction.
            </p>
          </div>
          <RestrictedPartyScreening />
        </div>
        <div className="page-note">
          <span>Agent Passport</span>
          <p>
            This page illustrates the product and does not perform business
            actions.
          </p>
        </div>
      </section>
    </main>
  );
}
