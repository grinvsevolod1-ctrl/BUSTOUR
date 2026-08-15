import assert from "node:assert/strict"
import { formatArticleDate } from "@/lib/article-date"

assert.equal(formatArticleDate("2021-06-10"), "10 июня 2021")
assert.equal(formatArticleDate("10 июня 2021"), "10 июня 2021")
console.log("article date self-check: ok")
