/**
 * Orphan CMS remap planner (slug rename leftovers).
 * Run: npx tsx scripts/orphan-cms-cleanup.selfcheck.ts
 */
import assert from "node:assert/strict"
import {
  isContentfulBag,
  isEmptyLiveBag,
  pageKeyFromSettingKey,
  planOrphanCmsRemaps,
  scoreOrphanToLive,
  type CmsLiveEntity,
  type CmsPageBag,
} from "../lib/orphan-cms-cleanup"

assert.equal(pageKeyFromSettingKey("country:avia:egipet.h1"), "country:avia:egipet")
assert.equal(pageKeyFromSettingKey("city:bus:spb.seoHtml"), "city:bus:spb")
assert.equal(pageKeyFromSettingKey("tour:old-slug.section.faq"), "tour:old-slug")
assert.equal(pageKeyFromSettingKey("tour:42.metaTitle"), "tour:42")
assert.equal(pageKeyFromSettingKey("hot.h1"), "hot")

assert.equal(
  isContentfulBag({
    pageKey: "x",
    settingKeys: ["country:avia:old.visible"],
    blockCount: 0,
  }),
  false,
)
assert.equal(
  isContentfulBag({
    pageKey: "x",
    settingKeys: ["country:avia:old.h1"],
    blockCount: 0,
  }),
  true,
)
assert.equal(
  isEmptyLiveBag({
    pageKey: "x",
    settingKeys: ["country:avia:new.visible", "country:avia:new.section.callus"],
    blockCount: 0,
  }),
  true,
)
assert.equal(
  isEmptyLiveBag({
    pageKey: "x",
    settingKeys: ["country:avia:new.h1"],
    blockCount: 0,
  }),
  false,
)

assert.ok(scoreOrphanToLive("egipet", { pageKey: "c", name: "Египет", slug: "egypt", kind: "country" }) >= 30)

{
  const live: CmsLiveEntity[] = [
    { pageKey: "country:avia:egypt", name: "Египет", slug: "egypt", category: "avia", kind: "country" },
  ]
  const bags = new Map<string, CmsPageBag>([
    [
      "country:avia:egypt",
      { pageKey: "country:avia:egypt", settingKeys: ["country:avia:egypt.visible"], blockCount: 0 },
    ],
    [
      "country:avia:egipet",
      {
        pageKey: "country:avia:egipet",
        settingKeys: ["country:avia:egipet.h1", "country:avia:egipet.intro"],
        blockCount: 2,
      },
    ],
  ])
  const plan = planOrphanCmsRemaps(live, bags)
  assert.equal(plan.remaps.length, 1)
  assert.equal(plan.remaps[0]!.from, "country:avia:egipet")
  assert.equal(plan.remaps[0]!.to, "country:avia:egypt")
  assert.deepEqual(plan.purgeDuplicates, [])
}

{
  // Ambiguous: two empties, one orphan → at most one remap; leftover reported
  const live: CmsLiveEntity[] = [
    { pageKey: "city:bus:a", name: "A", slug: "a", category: "bus", kind: "city" },
    { pageKey: "city:bus:b", name: "B", slug: "b", category: "bus", kind: "city" },
  ]
  const bags = new Map<string, CmsPageBag>([
    ["city:bus:old-spb", { pageKey: "city:bus:old-spb", settingKeys: ["city:bus:old-spb.h1"], blockCount: 0 }],
  ])
  const plan = planOrphanCmsRemaps(live, bags)
  assert.ok(plan.remaps.length <= 1)
  assert.ok(plan.unmatchedOrphans.length + plan.remaps.length >= 1)
}

console.log("orphan-cms-cleanup.selfcheck ok")
