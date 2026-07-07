import type { NextConfig } from "next";

// Lumen's whole security model rests on encryption keys living in JS memory and
// the wrapped vault in localStorage — so an XSS is a total key compromise. These
// headers are the delivery-boundary hardening for that.
//
// The real defense here is the EXFILTRATION BARRIER, not script-src. Next's App
// Router emits inline RSC bootstrap scripts that only a per-request nonce can
// cover, and a nonce CSP forces every page dynamic (killing static rendering and
// prefetch). So script-src keeps 'unsafe-inline' — but connect-src, img-src and
// form-action are all locked to 'self', so even an injected script has nowhere
// to send the keys: no fetch/XHR/beacon/websocket, image pixel, or form POST can
// reach an off-origin endpoint. Combined with React's default escaping and zero
// dangerouslySetInnerHTML in the tree, that closes the steal-the-keys path.
// ponytail: switch to a nonce CSP (proxy.ts) only if a native/dynamic build
// removes the static-rendering constraint — then drop 'unsafe-inline'.
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'", // Tailwind + Next inject inline styles
  "img-src 'self' blob: data:",
  "font-src 'self'", // next/font self-hosts Google fonts at build
  "connect-src 'self'", // exfil barrier: sync API is same-origin, no 3rd-party
  "worker-src 'self'", // the offline service worker
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'", // clickjacking: nothing may frame the unlock UI
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // don't advertise the framework/version
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
