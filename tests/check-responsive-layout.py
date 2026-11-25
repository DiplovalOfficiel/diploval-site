#!/usr/bin/env python3
"""Visual regression: mobile sections must occupy the viewport without double margins.

Run against the actual public homepage and its CSS/JS using local Chromium.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("DIPLOVAL_LAYOUT_URL", "http://127.0.0.1:8765/")
WIDTHS = (320, 344, 360, 390, 430, 768, 1280)
SECTIONS = (
    "#accueil", ".home-shortcuts", ".institutional-front",
    "#travaux", ".home-follow-grid", "#services",
    "main > .home-deep", "main > .home-small-extra",
    "#apropos", "main > .home-more-info", "#contact",
)

def rect(page, selector):
    item = page.locator(selector).first
    if item.count() == 0 or not item.is_visible():
        return None
    return item.evaluate("""el => {
       const b=el.getBoundingClientRect();
       return {x:b.left,width:b.width,right:b.right,
               display:getComputedStyle(el).display};
    }""")

def near(value, expected, distance=2):
    return abs(value-expected) <= distance

def check(page, width, failures):
    # Reproduire aussi le parcours des visiteurs qui ouvrent les panneaux.
    for selector in (
        "#travaux > .home-library", "#services > .home-missions",
        "main > .home-deep", "main > .home-small-extra",
        "main > .home-more-info",
    ):
        panels = page.locator(selector)
        if panels.count():
            panels.first.evaluate("el => { el.open = true; }")
    page.wait_for_timeout(120)
    horizontal = page.evaluate("""() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    })""")
    if horizontal["document"] > width + 2:
        failures.append(f"{width}px: horizontal overflow, document={horizontal['document']}")
    if width > 760:
        return
    for selector in SECTIONS:
        b=rect(page,selector)
        if not b:
            failures.append(f"{width}px: missing/hidden section {selector}")
        elif not (near(b["x"],0) and near(b["right"],width)):
            failures.append(f"{width}px: {selector} x={b['x']:.1f} right={b['right']:.1f} (expected 0..{width})")
    # Les panneaux supplémentaires restent bord à bord après ouverture.
    for selector in (
        "main > .home-deep > .section",
        "main > .home-small-extra > .section",
        "main > .home-more-info > .section",
        "#travaux > .home-library",
    ):
        matches=page.locator(selector)
        if not matches.count():
            failures.append(f"{width}px: no expanded panel for {selector}")
        for i in range(matches.count()):
            item=matches.nth(i)
            if not item.is_visible():
                failures.append(f"{width}px: hidden expanded panel {selector}[{i}]")
                continue
            b=item.evaluate("""el => {
                const r=el.getBoundingClientRect();
                return {x:r.left,right:r.right,width:r.width};
            }""")
            if not (near(b["x"],0) and near(b["right"],width)):
                failures.append(f"{width}px: nested {selector}[{i}] not full width: {b}")
    # The featured publication card should have a single inset of about 16px,
    # not a second 16-42px inset from details and the old scroller.
    container=rect(page,"#admin-featured-publications")
    first=rect(page,"#admin-featured-publications > .work-card")
    if container:
        if not (near(container["x"],0) and near(container["right"],width)):
            failures.append(f"{width}px: featured grid is not full width: {container}")
    else:
        failures.append(f"{width}px: featured grid not found")
    if first:
        if not (12 <= first["x"] <= 24 and width-24 <= first["right"] <= width-12):
            failures.append(f"{width}px: featured card has double inset: {first}")
    else:
        failures.append(f"{width}px: featured publication card not found")
    # All other cards stay within the viewport without a cut-off label.
    for selector in ("#admin-articles-list .actualite-card",
                     ".participation-home .pc-card",
                     ".home-follow-grid .social-card",
                     ".home-follow-grid .newsletter-form"):
        item=rect(page,selector)
        if item and (item["x"] < -2 or item["right"] > width+2):
            failures.append(f"{width}px: {selector} extends outside viewport: {item}")


def check_identity(page, width, failures):
    # Vérifier le rendu du logo commun et de la présentation à quatre panneaux.
    logo = page.locator(".site-header .brand img").first
    if not logo.count() or not logo.get_attribute("src").endswith("/diploval-embleme-v2.webp"):
        failures.append(f"{width}px: nouveau logo absent")
    elif not logo.evaluate("el => el.complete && el.naturalWidth > 0"):
        failures.append(f"{width}px: logo non chargé")
    if page.locator(".site-header").evaluate("el => getComputedStyle(el).backgroundColor") != "rgb(6, 32, 57)":
        failures.append(f"{width}px: en-tête institutionnel bleu nuit absent")
    track = page.locator(".dv-v2-intro__track")
    if not track.count() or track.locator(".dv-v2-intro__panel").count() != 4:
        failures.append(f"{width}px: présentation institutionnelle incomplète")
        return
    if not track.evaluate("el => el.scrollWidth > el.clientWidth"):
        failures.append(f"{width}px: panneaux non défilants")
    if not track.locator("h1").count() or "au service du vivant" not in track.locator("h1").inner_text().lower():
        failures.append(f"{width}px: signature institutionnelle absente")
    page.locator('.dv-v2-intro__nav a[href="#dv-v2-panel-2"]').click()
    page.wait_for_timeout(650)
    if not track.evaluate("el => el.scrollLeft > el.clientWidth * 0.5"):
        failures.append(f"{width}px: navigation vers le deuxième panneau impossible")
    page.locator('.dv-v2-intro__nav a[href="#dv-v2-panel-1"]').click()
    page.wait_for_timeout(650)

def check_public_pages(browser, width, failures):
    # Pages statiques et générées : une seule identité, aucune largeur débordante.
    for route in ("points-information.html", "propositions-contributions.html",
                  "communiques.html", "publications/charte/", "dico/"):
        page = browser.new_page(viewport={"width":width,"height":850})
        try:
            response = page.goto(BASE.rstrip("/") + "/" + route, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(500)
            if not response or response.status >= 400:
                failures.append(f"{width}px: page indisponible {route}")
                continue
            if page.locator(".site-header .brand img[src='/assets/diploval-embleme-v2.webp']").count() != 1:
                failures.append(f"{width}px: logo commun absent sur {route}")
            if page.locator("link[href='/charte-v21.css?v=2']").count() != 1:
                failures.append(f"{width}px: charte globale absente sur {route}")
            if page.locator("link[rel='icon'][href='/assets/diploval-embleme-v2.webp']").count() != 1:
                failures.append(f"{width}px: emblème absent ou répété sur {route}")
            if page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2"):
                failures.append(f"{width}px: débordement horizontal sur {route}")
        finally:
            page.close()


def check_home_modules(page, width, failures):
    dico = page.locator(".dico-spotlight")
    participation = page.locator("#propositions-contributions-home")
    watch = page.locator("#strategic-watch")
    if not dico.is_visible() or not participation.is_visible():
        failures.append(f"{width}px: cartes découverte absentes")
        return
    d, p = dico.bounding_box(), participation.bounding_box()
    if width >= 961:
        if abs(d["y"] - p["y"]) > 3 or abs(d["width"] - p["width"]) > 3 or d["x"] + d["width"] > p["x"] + 2:
            failures.append(f"{width}px: Dico et consultations non alignés côte à côte")
    elif d["y"] + d["height"] > p["y"] + 2:
        failures.append(f"{width}px: cartes découverte non empilées")
    if not watch.is_visible():
        failures.append(f"{width}px: module situations suivies absent")
        return
    b = watch.bounding_box()
    if width >= 961:
        ref = page.locator(".home-shortcuts").bounding_box()
        if abs(b["x"] - ref["x"]) > 3 or abs(b["width"] - ref["width"]) > 3:
            failures.append(f"{width}px: module de suivi désaligné des accès rapides")
    for selector in (".strategic-watch__main", ".strategic-watch__help", ".dico-spotlight", "#propositions-contributions-home"):
        for el in page.locator(selector).all():
            if el.is_visible() and el.evaluate("el => el.scrollWidth > el.clientWidth + 3"):
                failures.append(f"{width}px: débordement interne {selector}")
    if watch.locator(".strategic-watch__item").count() < 1:
        failures.append(f"{width}px: aucune situation affichée")
    if dico.locator("h2").evaluate("el => getComputedStyle(el).color") != "rgb(245, 240, 230)":
        failures.append(f"{width}px: titre Dico illisible ou non harmonisé")

def main():
    failures=[]
    Path("layout-screenshots").mkdir(exist_ok=True)
    with sync_playwright() as p:
        for engine in (p.chromium, p.firefox):
            options = {"headless": True}
            if engine.name == "chromium":
                options["args"] = ["--no-sandbox"]
            browser=engine.launch(**options)
            try:
                for width in WIDTHS:
                    mobile=width<=430 and engine.name=="chromium"
                    page=browser.new_page(viewport={"width":width,"height":850},
                                          device_scale_factor=1, is_mobile=mobile,
                                          has_touch=mobile)
                    page.goto(BASE,wait_until="domcontentloaded",timeout=30000)
                    page.wait_for_timeout(1200)
                    if width in (344,390,1280):
                        page.screenshot(path=f"layout-screenshots/{engine.name}-accueil-{width}px.png",
                                        full_page=True, animations="disabled")
                    check(page,width,failures)
                    check_identity(page,width,failures)
                    check_home_modules(page,width,failures)
                    print(f"{engine.name}: responsive layout checked at {width}px")
                    page.close()
                for width in (344, 1280):
                    check_public_pages(browser,width,failures)
            finally:
                browser.close()
    if failures:
        for f in failures: print("ERROR:",f)
        raise SystemExit(f"{len(failures)} responsive layout regressions")
    print("Responsive layout OK: Chromium and Firefox, seven viewport widths, all sections and cards.")

if __name__ == "__main__":
    main()
