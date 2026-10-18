export const sources = {
  us: { title: "FTC CAN-SPAM compliance guide", url: "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business", reviewed_as_of: "2026-10-17" },
  usStatute: { title: "15 USC 7704 advertising identification exception", url: "https://uscode.house.gov/us/usc/119-118/t15/s7704/", reviewed_as_of: "2026-10-17" },
  ca: { title: "CRTC guidance on implied consent", url: "https://crtc.gc.ca/eng/com500/guide.htm", reviewed_as_of: "2026-10-17" },
  caMessages: { title: "CRTC identification and unsubscribe guidance", url: "https://crtc.gc.ca/eng/com500/faq500.htm", reviewed_as_of: "2026-10-17" },
  caScope: { title: "CASL sections 6, 10, 11 and 12", url: "https://laws-lois.justice.gc.ca/eng/acts/E-1.6/FullText.html", reviewed_as_of: "2026-10-17" },
  gb: { title: "ICO electronic mail marketing guidance", url: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/", reviewed_as_of: "2026-10-17" },
} as const;

export const policyPacks = {
  US: { id: "us-can-spam", title: "US CAN-SPAM", sources: [sources.us] },
  CA: { id: "ca-casl", title: "Canada CASL", sources: [sources.ca, sources.caMessages, sources.caScope] },
  GB: { id: "gb-pecr", title: "UK PECR", sources: [sources.gb] },
} as const;

export const evidenceFreshnessMs = {
  sender_profile: 30 * 86_400_000, content_review: 30 * 86_400_000,
  permission: 86_400_000, suppression: 15 * 60_000, unsubscribe: 86_400_000, subscriber: 30 * 86_400_000,
} as const;
