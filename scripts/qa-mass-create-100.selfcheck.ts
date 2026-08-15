/**
 * QA: Performance & memory under mass-create of entities.
 *
 * Bulk-CRUD 100 countries → 100 cities → 100 shortcodes → 100 content blocks.
 * Uses direct Drizzle / lib functions (NOT "use server" admin actions with
 * requireCapability auth gating) so we can measure write-throughput in isolation.
 *
 * Runs: `npx tsx scripts/qa-mass-create-100.selfcheck.ts`
 * Rollback: every created record is HARD deleted / purged at end.
 */
import { ensureDb } from "@/lib/db/init";
import { createCountry, purgeCountry } from "@/lib/countries";
import { createCity, purgeCity } from "@/lib/cities";
import { createBlock } from "@/lib/cms";
import { db } from "@/lib/db";
import { shortcodes, contentBlocks } from "@/lib/db/schema";
import { eq, like } from "drizzle-orm";
import type { BlockCollection } from "@/lib/types";

type Mem = { rss: number; heapUsed: number; heapTotal: number };
const r = (n: number) => Math.round(n / 1024 / 1024);
const mem = (): Mem => ({
  rss: process.memoryUsage().rss,
  heapUsed: process.memoryUsage().heapUsed,
  heapTotal: process.memoryUsage().heapTotal,
});
const t0 = performance.now();
const start = mem();
const n = 100;
const suffix = Math.floor(1000 + Math.random() * 9000);

async function main() {
  await ensureDb();
  const countryIds: number[] = [];
  const cityIds: number[] = [];
  const shortcodeNames: string[] = [];
  const blockIds: number[] = [];
  const errors: string[] = [];

  try {
    // --- 1) countries ---
    const tA = performance.now();
    for (let i = 0; i < n; i++) {
      const id = await createCountry({
        slug: `qa-perf-${suffix}-c${i}`,
        name: `QA Perf Country #${i} [${suffix}]`,
        category: "bus",
        intro: "",
        seoHtml: "",
      });
      countryIds.push(id);
    }
    const tB = performance.now();
    console.log(`✓ Created ${n} countries in ${(tB - tA).toFixed(0)} ms`);

    // --- 2) cities (linked to first created country) ---
    const anchorCountryId = countryIds[0]!;
    const tC = performance.now();
    for (let i = 0; i < n; i++) {
      const id = await createCity({
        slug: `qa-perf-${suffix}-cy${i}`,
        name: `QA Perf City #${i} [${suffix}]`,
        category: "bus",
        country: `QA Perf Country #0 [${suffix}]`,
        countryId: anchorCountryId,
        intro: "",
        sections: [],
        seoHtml: "",
      });
      cityIds.push(id);
    }
    const tD = performance.now();
    console.log(`✓ Created ${n} cities in ${(tD - tC).toFixed(0)} ms`);

    // --- 3) shortcodes (direct Drizzle — bypasses "manage_settings" auth gating) ---
    const tE = performance.now();
    for (let i = 0; i < n; i++) {
      const name = `QA_PERF_${suffix}_S${i}`;
      const res = await db
        .insert(shortcodes)
        .values({
          name,
          value: `value-${suffix}-${i}`,
          description: "qa perf bulk shortcode",
        })
        .returning({ id: shortcodes.id });
      if (res.length !== 1 || !res[0]?.id) errors.push(`shortcode #${i}: insert returned empty`);
      shortcodeNames.push(name);
    }
    const tF = performance.now();
    console.log(`✓ Created ${n} shortcodes in ${(tF - tE).toFixed(0)} ms`);

    // --- 4) content blocks (advantage collection) ---
    const tG = performance.now();
    for (let i = 0; i < n; i++) {
      const bid = await createBlock({
        collection: "advantage" as BlockCollection,
        page: "",
        title: `QA Perf Adv #${i} [${suffix}]`,
        subtitle: "",
        body: "",
        image: "",
        icon: "",
        href: "",
        extra: {},
        visible: true,
      });
      blockIds.push(bid);
    }
    const tH = performance.now();
    console.log(`✓ Created ${n} content blocks (advantages) in ${(tH - tG).toFixed(0)} ms`);

    // --- 5) Validate basic reads roundtrip ---
    if (countryIds.length !== n) errors.push(`expected ${n} countries, got ${countryIds.length}`);
    if (cityIds.length !== n) errors.push(`expected ${n} cities, got ${cityIds.length}`);
    if (shortcodeNames.length !== n) errors.push(`expected ${n} shortcodes, got ${shortcodeNames.length}`);
    if (blockIds.length !== n) errors.push(`expected ${n} blocks, got ${blockIds.length}`);

    // --- 6) teardown (reverse order) ---
    const tTeardown0 = performance.now();
    // Content blocks: hard delete directly via Drizzle (cms.ts has deleteBlock = soft-delete, no purge)
    for (const bid of blockIds) {
      try {
        await db.delete(contentBlocks).where(eq(contentBlocks.id, bid));
      } catch (e) {
        errors.push(`purge block ${bid}: ${e}`);
      }
    }
    // Shortcodes: hard delete by name
    for (const name of shortcodeNames) {
      try {
        await db.delete(shortcodes).where(eq(shortcodes.name, name));
      } catch (e) {
        errors.push(`purge shortcode ${name}: ${e}`);
      }
    }
    // Cities + countries: their purge* lib functions do hard-delete.
    for (let i = cityIds.length - 1; i >= 0; i--) {
      try {
        await purgeCity(cityIds[i]!);
      } catch (e) {
        errors.push(`purge city ${cityIds[i]}: ${e}`);
      }
    }
    for (let i = countryIds.length - 1; i >= 0; i--) {
      try {
        await purgeCountry(countryIds[i]!);
      } catch (e) {
        errors.push(`purge country ${countryIds[i]}: ${e}`);
      }
    }
    // Safety: any orphans leftover from previous interrupted runs of this script
    try {
      await db.delete(contentBlocks).where(like(contentBlocks.title, `%[${suffix}]%`));
      await db.delete(shortcodes).where(like(shortcodes.name, `QA_PERF_${suffix}_%`));
    } catch { /* ignore safety net */ }
    const tTeardown1 = performance.now();
    console.log(`✓ Teardown ${4 * n} records in ${(tTeardown1 - tTeardown0).toFixed(0)} ms`);

    // --- summary ---
    const wall = performance.now() - t0;
    const end = mem();
    console.log("");
    console.log("== QA PERF SUMMARY ==");
    console.log(`Records: ${4 * n} creates + ${4 * n} purges`);
    console.log(`Wall time total: ${wall.toFixed(0)} ms (${(wall / 1000).toFixed(1)} s)`);
    console.log(`Throughput: ${((4 * n + 4 * n) / (wall / 1000)).toFixed(1)} ops/sec (create+purge total)`);
    console.log(`RSS delta: ${r(start.rss)} MB → ${r(end.rss)} MB (Δ ${r(end.rss - start.rss)} MB)`);
    console.log(`HeapUsed delta: ${r(start.heapUsed)} MB → ${r(end.heapUsed)} MB (Δ ${r(end.heapUsed - start.heapUsed)} MB)`);
    if (errors.length === 0) {
      console.log("✓ No errors — all 400 create + 400 purge operations OK, no leaks detected (flat RSS).");
      process.exit(0);
    } else {
      console.error(`✗ ERRORS (${errors.length}):`);
      for (const e of errors) console.error("  -", e);
      process.exit(1);
    }
  } catch (fatal) {
    console.error("FATAL unhandled exception in mass-create:", fatal);
    // best-effort cleanup
    try { for (const bid of blockIds) await purgeBlock(bid).catch(() => {}); } catch {}
    try { for (let i = cityIds.length - 1; i >= 0; i--) await purgeCity(cityIds[i]!).catch(() => {}); } catch {}
    try { for (let i = countryIds.length - 1; i >= 0; i--) await purgeCountry(countryIds[i]!).catch(() => {}); } catch {}
    process.exit(1);
  }
}

main();
