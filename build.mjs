/**
 * Smart build script for Cloudflare Workers deployment.
 *
 * When called directly (by Cloudflare build system):
 *   → Runs @cloudflare/next-on-pages (full Worker build)
 *
 * When called by vercel build internally (VERCEL env set):
 *   → Runs next build only (avoids infinite recursion)
 */
import { execSync } from "child_process";

if (process.env.VERCEL) {
  // Inside vercel build — just compile Next.js, don't recurse
  console.log("📦 VERCEL detected → running next build (skip CF conversion)");
  execSync("npx next build", { stdio: "inherit" });
} else {
  // Direct call from Cloudflare build system → full Worker build
  console.log("🚀 Building for Cloudflare Workers...");
  execSync("npx @cloudflare/next-on-pages", { stdio: "inherit" });
}
