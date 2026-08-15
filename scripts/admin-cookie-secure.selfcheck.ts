/**
 * Selfcheck: admin session cookie Secure follows public site URL / override.
 * Run: npx tsx scripts/admin-cookie-secure.selfcheck.ts
 */
import assert from "node:assert/strict"
import { adminSessionCookieSecure } from "../lib/admin-session"

const ORIG_SITE = process.env.NEXT_PUBLIC_SITE_URL
const ORIG_SECURE = process.env.ADMIN_COOKIE_SECURE
const ORIG_NODE = process.env.NODE_ENV

try {
  process.env.NEXT_PUBLIC_SITE_URL = "http://31.77.228.133:3000"
  delete process.env.ADMIN_COOKIE_SECURE
  process.env.NODE_ENV = "production"
  assert.equal(adminSessionCookieSecure(), false, "http site → not secure even in production")

  process.env.NEXT_PUBLIC_SITE_URL = "https://bastur.by"
  assert.equal(adminSessionCookieSecure(), true, "https site → secure")

  process.env.ADMIN_COOKIE_SECURE = "0"
  assert.equal(adminSessionCookieSecure(), false, "override 0 wins over https")

  process.env.ADMIN_COOKIE_SECURE = "1"
  process.env.NEXT_PUBLIC_SITE_URL = "http://example.com"
  assert.equal(adminSessionCookieSecure(), true, "override 1 wins over http")

  delete process.env.ADMIN_COOKIE_SECURE
  delete process.env.NEXT_PUBLIC_SITE_URL
  process.env.NODE_ENV = "production"
  assert.equal(adminSessionCookieSecure(), true, "no site URL + production → secure")

  process.env.NODE_ENV = "development"
  assert.equal(adminSessionCookieSecure(), false, "no site URL + development → not secure")

  console.log("ok")
} finally {
  if (ORIG_SITE === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = ORIG_SITE
  if (ORIG_SECURE === undefined) delete process.env.ADMIN_COOKIE_SECURE
  else process.env.ADMIN_COOKIE_SECURE = ORIG_SECURE
  if (ORIG_NODE === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = ORIG_NODE
}
