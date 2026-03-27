const appDomainName = import.meta.env.APP_DOMAIN_NAME;
if (!appDomainName) {
  throw new Error('APP_DOMAIN_NAME environment variable not set');
}

// Use HTTP for localhost, HTTPS for production
const isLocal = appDomainName.includes('localhost') || appDomainName.includes('127.0.0.1');
export const APP_BASE_URL = `${isLocal ? 'http' : 'https'}://${appDomainName}`;

const appSupportEmail = import.meta.env.APP_SUPPORT_EMAIL;
if (!appSupportEmail) {
  throw new Error('APP_SUPPORT_EMAIL environment variable not set');
}

export const APP_SUPPORT_EMAIL = appSupportEmail;