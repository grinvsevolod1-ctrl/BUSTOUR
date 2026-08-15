"""Smoke public catalog pages via Playwright (dev server must be up on :3000).

Run: python scripts/smoke_public_cms.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
PAGES = [
    ("bus home", "/avtobusnye-tury/"),
    ("avia home", "/aviatory/"),
    ("hot home", "/hot/"),
    ("bus country", "/avtobusnye-tury/turciya/"),
    ("bus city", "/avtobusnye-tury/rossiya/moskva/"),
    ("hot city", "/hot/turciya/goryachaya-antalya/"),
]


def main() -> int:
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        for name, path in PAGES:
            url = BASE + path
            row = {"name": name, "url": url, "ok": False, "status": None, "h1": None, "error": None}
            try:
                resp = page.goto(url, wait_until="domcontentloaded", timeout=60_000)
                row["status"] = resp.status if resp else None
                page.wait_for_load_state("networkidle", timeout=30_000)
                h1 = page.locator("h1").first
                h1.wait_for(state="visible", timeout=15_000)
                row["h1"] = h1.inner_text().strip()
                row["ok"] = bool(row["status"] and row["status"] < 400 and row["h1"])
            except Exception as e:  # noqa: BLE001 — smoke report
                row["error"] = str(e)[:300]
            results.append(row)
            print(("PASS" if row["ok"] else "FAIL"), name, row.get("status"), (row.get("h1") or row.get("error") or "")[:80])
        browser.close()

    out_dir = Path("analisis") / "2026 07 22"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "public-cms-playwright-smoke.json"
    payload = {"generated": datetime.now(timezone.utc).isoformat(), "results": results}
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", out)
    return 0 if all(r["ok"] for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
