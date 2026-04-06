import type { CatalogPreferenceGroup, PreferenceCatalogEntry } from "../types/preferences";

export type { CatalogPreferenceGroup, PreferenceCatalogEntry };

/** Application-owned catalog (titles, defaults, grouping). Keys are whitelisted for PATCH. */
export const PREFERENCE_CATALOG: readonly PreferenceCatalogEntry[] = [
  {
    key: "shareDataWithBureaus",
    title: "Share data with bureaus",
    description: "Allow automatic data sharing with credit bureaus",
    group: "PRIVACY",
    sortOrder: 1,
    defaultValue: false,
  },
  {
    key: "analyticsAndImprovements",
    title: "Analytics & Improvements",
    description: "Help us improve by sharing anonymous usage data",
    group: "PRIVACY",
    sortOrder: 2,
    defaultValue: false,
  },
  {
    key: "personalizedRecommendations",
    title: "Personalized Recommendations",
    description: "Get AI-powered suggestions based on your data",
    group: "PRIVACY",
    sortOrder: 3,
    defaultValue: false,
  },
  {
    key: "emailDisputeUpdates",
    title: "Dispute Updates",
    description: "Get notified when disputes are approved or rejected",
    group: "EMAIL_NOTIFICATION",
    sortOrder: 1,
    defaultValue: true,
  },
  {
    key: "emailScoreChanges",
    title: "Score Changes",
    description: "Receive alerts when your credit score changes",
    group: "EMAIL_NOTIFICATION",
    sortOrder: 2,
    defaultValue: true,
  },
  {
    key: "emailWeeklyReports",
    title: "Weekly Reports",
    description: "Get weekly summary of your credit progress",
    group: "EMAIL_NOTIFICATION",
    sortOrder: 3,
    defaultValue: true,
  },
  {
    key: "emailMarketing",
    title: "Marketing Emails",
    description: "Receive tips, guides, and product updates",
    group: "EMAIL_NOTIFICATION",
    sortOrder: 4,
    defaultValue: false,
  },
  {
    key: "pushBrowserNotifications",
    title: "Browser Notifications",
    description: "Get instant updates in your browser",
    group: "PUSH_NOTIFICATION",
    sortOrder: 1,
    defaultValue: true,
  },
  {
    key: "pushMobileNotifications",
    title: "Mobile Notifications",
    description: "Receive push notifications on your phone",
    group: "PUSH_NOTIFICATION",
    sortOrder: 2,
    defaultValue: true,
  },
];

const sortedCatalog = [...PREFERENCE_CATALOG].sort((a, b) => {
  if (a.group !== b.group) {
    return a.group.localeCompare(b.group);
  }
  return a.sortOrder - b.sortOrder;
});

export function listCatalogEntries(): readonly PreferenceCatalogEntry[] {
  return sortedCatalog;
}

export function catalogByKey(): Map<string, PreferenceCatalogEntry> {
  return new Map(PREFERENCE_CATALOG.map((e) => [e.key, e]));
}

export function groupApiSegment(group: CatalogPreferenceGroup): "privacy" | "email" | "push" {
  if (group === "PRIVACY") {
    return "privacy";
  }
  if (group === "EMAIL_NOTIFICATION") {
    return "email";
  }
  return "push";
}
