const appDomainName = import.meta.env.APP_DOMAIN_NAME;
if (!appDomainName) {
  throw new Error("APP_DOMAIN_NAME environment variable not set");
}

// Use HTTP for localhost, HTTPS for production
const isLocal =
  appDomainName.includes("localhost") || appDomainName.includes("127.0.0.1");
export const APP_BASE_URL = `${isLocal ? "http" : "https"}://${appDomainName}`;

const appSupportEmail = import.meta.env.APP_SUPPORT_EMAIL;
if (!appSupportEmail) {
  throw new Error("APP_SUPPORT_EMAIL environment variable not set");
}

export const APP_SUPPORT_EMAIL = appSupportEmail;

export const STORAGE_KEYS = {
  SESSION: "beeroclock_session",
  PROFILE: "beeroclock_profile",
  CUSTOM_BEERS: "beeroclock_custom_beers",
  FAVOURITES: "beeroclock_favourite_ids",
  BEERS_CACHE: "beeroclock_beers",
  PRIVACY_DISMISSED: "beeroclock_privacy_dismissed",
  UNAUTH_DISMISSED: "beeroclock_unauth_notice_dismissed",
  PROFILE_NOTICE_DISMISSED: "beeroclock_profile_notice_dismissed",
  OFFLINE_QUEUE: "beeroclock_offline_queue",
  HISTORY: "beeroclock_history",
  LAST_BEER: "beeroclock_last_beer",
} as const;

export const API_ROUTES = {
  HISTORY: "/api/history",
  SEND_MAGIC_LINK: "/api/send-magic-link",
} as const;
