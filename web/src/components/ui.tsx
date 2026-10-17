import type { ReactNode } from "react";

type Decision = "ready" | "blocked" | "needs_information" | "review_required";
type IconName =
  | "arrow"
  | "check"
  | "globe"
  | "route"
  | "file"
  | "shield"
  | "mail"
  | "briefcase"
  | "clock";
const paths: Record<IconName, ReactNode> = {
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18M5 6h14M5 18h14" />
    </>
  ),
  route: (
    <>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 6h9a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8" />
    </>
  ),
  file: <path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8M8 16h5" />,
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V3h8v4M3 12c5 3 13 3 18 0M12 12v5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
};
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function Logo() {
  return (
    <a className="logo" href="#overview" aria-label="Agent Passport home">
      <img src="/icon.svg" width="34" height="34" alt="" />
      <span>
        Agent Passport<span className="logo-period">.</span>
      </span>
    </a>
  );
}
export function Badge({
  decision,
  children,
}: {
  decision: Decision;
  children: ReactNode;
}) {
  return (
    <span className={`badge badge-${decision}`}>
      <span />
      {children}
    </span>
  );
}
export function ExampleLabel() {
  return (
    <span className="example-label">
      <span />
      Illustrative example
    </span>
  );
}
export function SectionLabel({
  number,
  children,
}: {
  number: string;
  children: ReactNode;
}) {
  return (
    <div className="section-label">
      <span>{number}</span>
      {children}
    </div>
  );
}
