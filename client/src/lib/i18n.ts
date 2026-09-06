export type Locale = "en";

export const translations = {
  en: {
    appName: "Flax Seed",
    appSubtitle: "Micro-Credit Enterprise",
    workspace: "Operations workspace",
    overview: "Overview",
    applications: "Applications",
    collections: "Collections",
    compliance: "Compliance",
    auditTrail: "Audit trail",
    newApplication: "New application",
    portfolio: "Portfolio at a glance",
    activeLoans: "Active loans",
    collected: "Collected this month",
    arrears: "Arrears to review",
    pendingReview: "Pending review",
    recentApplications: "Recent applications",
    viewAll: "View all",
    noData: "No records yet",
    signIn: "Sign in to continue",
    secureWorkspace: "Secure, branch-scoped lending operations",
    english: "English",
  },
} as const;

export function t(key: keyof typeof translations.en, locale: Locale = "en") {
  return translations[locale][key];
}
