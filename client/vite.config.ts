import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { FRONTEND_CSP, SECURITY_HEADERS } from "./securityHeaders.ts";

// CSP is not applied to `vite` (HMR needs eval).
// Preview matches Vercel except upgrade-insecure-requests (local HTTP).
const previewHeaders = {
  ...SECURITY_HEADERS,
  "Content-Security-Policy": FRONTEND_CSP.replace(
    "; upgrade-insecure-requests",
    ""
  ),
};

export default defineConfig({
  plugins: [react()],
  preview: {
    headers: previewHeaders,
  },
});
