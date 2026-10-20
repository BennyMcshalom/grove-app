// Google tag (gtag.js) setup for the landing page, measurement ID G-LWNT84KN3K.
// Kept in a file rather than inline so the page's Content-Security-Policy can
// stay free of 'unsafe-inline' (see src/lib/csp.ts, LANDING_CSP).
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag("js", new Date());
gtag("config", "G-LWNT84KN3K");
