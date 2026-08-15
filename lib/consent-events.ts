/** Custom event: footer settings link → ConsentProvider reopen (avoids duplicate-context useConsent). */
export const CONSENT_REOPEN_EVENT = "bastur:consent-reopen"

export function dispatchConsentReopen() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT))
}
