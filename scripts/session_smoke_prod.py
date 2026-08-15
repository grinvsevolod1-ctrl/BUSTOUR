"""Prod smoke for session features. Usage: python scripts/session_smoke_prod.py"""
import re

from playwright.sync_api import sync_playwright

BASE = "https://bustour-nu.vercel.app"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f"{BASE}/avtobusnye-tury/", wait_until="networkidle")
        cards = page.locator("article").count()
        assert cards >= 5, f"expected >=5 tour cards, got {cards}"
        assert page.get_by_text("Показать ещё").count() == 0, "ghost show-more"

        page.goto(
            f"{BASE}/avtobusnye-tury/rossiya/sankt-peterburg/tur-vyhodnogo-dnya-v-piter",
            wait_until="networkidle",
        )
        assert "500" not in page.title().lower()
        ld = page.locator('script[type="application/ld+json"]').all_inner_texts()
        assert any("Product" in t for t in ld), "Product JSON-LD missing"

        page.goto(f"{BASE}/", wait_until="networkidle")
        assert page.get_by_role("button", name="Больше туров").count() == 1
        assert page.locator('a[href="/tours/all"]').count() == 0

        page.goto(f"{BASE}/bus-rental/", wait_until="networkidle")
        href = page.locator('a[href^="/bus-rental/"]').first.get_attribute("href")
        assert href
        page.goto(f"{BASE}{href}", wait_until="networkidle")
        page.get_by_role("button", name=re.compile(r"Заказать|аренду", re.I)).first.click()
        page.wait_for_timeout(400)
        assert page.get_by_text("Заказать аренду автобуса").count() >= 1, "bus modal"

        page.goto(f"{BASE}/robots.txt")
        robots = page.locator("body").inner_text()
        assert "/admin" in robots and "sitemap" in robots.lower()

        browser.close()
        print("session_smoke_prod: ok")


if __name__ == "__main__":
    main()
