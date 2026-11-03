/** Only iOS and iPadOS set navigator.standalone to true, for a Home Screen app. */
export function isInstalledIOS(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
