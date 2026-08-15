import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

async function main() {
  const root = path.resolve(__dirname, "..")
  const src = fs.readFileSync(path.join(root, "app", "admin", "actions.ts"), "utf8")

  assert.match(
    src,
    /rekeyPageScopedContent\(`tour:/,
    "tour save rekeyPageScopedContent tour:* exists (baseline)",
  )
  assert.match(
    src,
    /rekeyPageScopedContent\(`bus:/,
    "bus save rekeyPageScopedContent bus:* exists (baseline)",
  )
  assert.match(
    src,
    /rekeyPageScopedContent\(`transfer:/,
    "transfer save rekeyPageScopedContent transfer:* exists (baseline)",
  )

  const saveArticleIdx = src.indexOf("export async function saveArticleAction")
  assert.ok(saveArticleIdx > 0, "saveArticleAction function present")
  const saveArticleBody = src.slice(
    saveArticleIdx,
    src.indexOf("export async function", saveArticleIdx + 10) > saveArticleIdx
      ? src.indexOf("export async function", saveArticleIdx + 10)
      : saveArticleIdx + 3500,
  )

  assert.match(
    saveArticleBody,
    /existingArticle\s*&&\s*existingArticle\.slug\s*!==\s*input\.slug[\s\S]{0,240}rekeyPageScopedContent\(`article:\$\{existingArticle\.slug\}`,\s*`article:\$\{input\.slug\}`\)/,
    "saveArticleAction rekeys scoped CMS content using article:<old> -> article:<new> on slug change (before updateArticleBase)",
  )

  assert.match(
    saveArticleBody,
    /revalidatePath\(`\/info\/\$\{existingArticle\.slug\}`\)/,
    "saveArticleAction revalidates OLD article slug public page after slug change (cache flush for moved scoped content)",
  )

  console.log("OK: 4/4 article slug rekey contracts match bus/tour/transfer parity pattern")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
