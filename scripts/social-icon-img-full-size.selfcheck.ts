// SOCIAL FIX: <img> иконок viber/telegram должен строго h-full w-full как контейнер SocialIconGlyph, не сжиматься от rounded-full wrapper.
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const social = readFileSync("components/site/social-icon.tsx", "utf8")

// T1: Viber + Telegram используют нативный <img> (не Next Image) чтобы не было sizing конфликтов width/height props vs className.
const noNextImageForViberTlg = !/Image src=["']\/figma\/(viber|telegram)\.svg/.test(social)
  && /<img[^>]*src=["']\/figma\/(viber|telegram)\.svg/.test(social)
assert.ok(noNextImageForViberTlg,
  "FAIL S1a: Viber/Telegram glyphs использовать нативный <img> вместо Next Image (чтобы sizing className = h-full w-full не конфликтовал с width/height props)")

// T2: Все <img> viber/telegram обязательно имеют в className h-full + w-full (строго размеры контейнера).
const imgFullSizeMatch = /<img[^>]*className=\{[^}]*h-full[^}]*w-full[^}]*\}/.test(social)
  || /<img[^>]*className="[^"]*h-full[^"]*w-full[^"]*"/.test(social)
  || /img[^>]*h-full[^>]*w-full/.test(social)
assert.ok(imgFullSizeMatch,
  "FAIL S1b: У <img> viber/telegram className содержит h-full w-full (строго размеры Glyph container SocialIconGlyph, без сжатия)")

// T3: object-contain или shrink-0 чтобы aspect ratio сохранился и не сжимался от rounded-full grid place-items.
const hasShrinkOrObject = /shrink-0|object-contain/.test(social)
assert.ok(hasShrinkOrObject,
  "FAIL S1c: className <img> содержит shrink-0 или object-contain (чтобы не сжимался в grid place-items-center)")

// T4: Header и Footer используют одинаковый socialCircleWrapperClass (уже было в предыдущем цикле) + glyph через SocialIconGlyph.
const header = readFileSync("components/site/site-header.tsx", "utf8")
const footer = readFileSync("components/site/site-footer.tsx", "utf8")
const bothUseSocialGlyph = /SocialIconGlyph icon=\{social\.icon\}/.test(header) && /SocialIconGlyph icon=\{social\.icon\}/.test(footer)
assert.ok(bothUseSocialGlyph, "FAIL S1d: Header/Footer оба рендерят SocialIconGlyph (единый компонент, стили применяются везде)")

console.log("PASS Social icon img full-size: <img> glyph h-full w-full = container height, NO shrinking inside rounded circle wrapper")
