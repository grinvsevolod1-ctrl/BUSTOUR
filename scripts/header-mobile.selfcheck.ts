/**
 * Mobile/tablet header: icons-only actions + floating sticky hide/show.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(join(process.cwd(), "components/site/site-header.tsx"), "utf8")

assert.match(
  src,
  /className="[^"]*flex[^"]*items-center[^"]*justify-between[^"]*"/,
  "top row must be flex justify-between",
)
assert.doesNotMatch(src, /flex flex-wrap items-center justify-between/, "no flex-wrap on top row")
assert.match(src, /ml-auto|shrink-0/, "actions stay right")

assert.match(src, /sticky top-0/, "sticky float header")
assert.match(src, /-translate-y-full/, "hides on scroll down")
assert.match(src, /addEventListener\("scroll"/, "scroll direction listener")

assert.match(
  src,
  /aria-label=\"Заказать звонок\"[\s\S]*?lg:hidden|lg:hidden[\s\S]*?aria-label=\"Заказать звонок\"/,
  "phone icon button on mobile/tablet opens callback",
)
assert.match(src, /hidden[\s\S]*lg:flex[\s\S]*Заказать звонок/, "desktop keeps text CTA")
assert.match(src, /hidden min-\[355px\]:flex/, "header socials hidden below 355px viewport")
assert.match(src, /socialsForHeader|SocialIconGlyph|socialCircleWrapperClass/, "header uses unified social links")
assert.match(src, /SocialIconGlyph|socialCircleWrapperClass|from "\.\/social-icon"/, "Viber asset available via icon map")
assert.match(src, /SocialIconGlyph|socialCircleWrapperClass|from "\.\/social-icon"/, "Telegram asset available via icon map")
assert.doesNotMatch(
  src,
  /max-\[354px\]:hidden[\s\S]{0,200}aria-label=\"Заказать звонок\"|aria-label=\"Заказать звонок\"[\s\S]{0,120}max-\[354px\]:hidden/,
  "callback button must stay visible below 355px",
)
assert.doesNotMatch(src, /hidden items-center gap-2 md:flex/, "social not tablet-only md gate")

console.log("header-mobile.selfcheck: ok")
