import { Badge, ExampleLabel, Icon } from "./ui.tsx";

export function PurchaseFlow() {
  return (
    <div
      className="agent-flow"
      aria-label="An illustrative purchase check and the agent’s follow-up"
    >
      <div className="illustration-heading">
        <Icon name="route" size={17} />A PURCHASE CHECK
      </div>
      <div className="agent-plan">
        <span className="small-icon">
          <Icon name="briefcase" size={19} />
        </span>
        <div>
          <small>YOUR AGENT’S PLAN</small>
          <p>Order coffee from the Dominican Republic for a US store.</p>
        </div>
      </div>
      <ol className="check-exchange">
        <li className="tool-response">
          <span className="exchange-marker">
            <img src="/icon.svg" width="26" height="26" alt="" />
          </span>
          <div>
            <small>AGENT PASSPORT</small>
            <h3>Food import requirement flagged</h3>
            <p>Resolve the FDA prior notice filing.</p>
          </div>
        </li>
        <li className="agent-follow-up">
          <span className="exchange-marker">
            <Icon name="file" size={18} />
          </span>
          <div>
            <small>YOUR AGENT</small>
            <h3>Holds the order and gets filing details</h3>
            <p>Rechecks before buying.</p>
          </div>
        </li>
      </ol>
      <div className="illustration-footer">
        <ExampleLabel />
      </div>
    </div>
  );
}

export function CampaignCompliance() {
  return (
    <div className="campaign-review">
      <div className="campaign-review-card">
        <div className="illustration-heading">
          <Icon name="mail" size={17} />
          EMAIL CAMPAIGN · CANADA
        </div>
        <div className="campaign-review-body">
          <div className="review-title">
            <h3>Campaign check</h3>
            <Badge decision="blocked">Send on hold</Badge>
          </div>
          <div className="campaign-plan">
            <small>YOUR AGENT’S PLAN</small>
            <p>Send our new collection announcement to customers in Canada.</p>
          </div>
          <ul
            className="campaign-issues"
            aria-label="Required compliance changes"
          >
            <li>
              <div className="finding-heading">
                <h4>Unsubscribe link</h4>
                <Badge decision="needs_information">Missing</Badge>
              </div>
              <p>
                Canada’s anti-spam rules require a working unsubscribe option
                for this promotional email.
              </p>
            </li>
            <li>
              <div className="finding-heading">
                <h4>Proof of consent</h4>
                <Badge decision="needs_information">Records missing</Badge>
              </div>
              <p>Confirm the consent basis for each intended recipient.</p>
            </li>
          </ul>
          <div className="campaign-next-step">
            <Icon name="route" size={18} />
            <div>
              <strong>Agent’s next step</strong>
              <p>
                Add the unsubscribe link and verify consent, then recheck before
                sending.
              </p>
            </div>
          </div>
        </div>
        <div className="illustration-footer">
          <ExampleLabel />
          <a
            className="source-link"
            href="https://crtc.gc.ca/eng/com500/faq500.htm"
            target="_blank"
            rel="noreferrer"
          >
            Canada’s anti-spam guidance
            <Icon name="arrow" size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
