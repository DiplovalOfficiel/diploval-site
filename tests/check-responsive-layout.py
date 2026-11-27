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
            if item.evaluate("el => el.hasAttribute('data-dv-panel')"):
                item.evaluate("el => el.parentElement.querySelector('.dv-mobile-nav button[data-dv-index=\"'+el.dataset.dvPanel+'\"]').click()")
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
            if page.locator("link[href='/charte-v21.css?v=5']").count() != 1:
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


def check_mobile_navigation(page, width, failures):
    groups = ((".home-deep", 4), (".home-small-extra", 3), (".home-more-info", 2))
    for selector, count in groups:
        owner=page.locator(selector)
        owner.evaluate("el => el.open = true")
        nav=owner.locator(".dv-mobile-nav")
        if nav.count()!=1 or nav.locator("button").count()!=count:
            failures.append(f"{width}px: navigation incomplète {selector}")
            continue
        pager=owner.locator(".dv-mobile-pager")
        if pager.count()!=1:
            failures.append(f"{width}px: navigation de fin absente {selector}")
            continue
        if width>760:
            if pager.is_visible():
                failures.append(f"{width}px: navigation de fin visible sur PC {selector}")
            if nav.is_visible():
                failures.append(f"{width}px: navigation mobile visible sur PC {selector}")
            if owner.locator(".dv-mobile-panel:not([hidden])").count() and selector!=".home-small-extra":
                for el in owner.locator(".dv-mobile-panel").all():
                    if not el.is_visible():
                        failures.append(f"{width}px: contenu PC masqué {selector}")
            continue
        for i in range(count):
            nav.locator("button").nth(i).evaluate("el => el.click()")
            if nav.locator("button[aria-pressed='true']").count()!=1 or nav.locator("button").nth(i).get_attribute("aria-pressed")!="true":
                failures.append(f"{width}px: sélection du panneau {i+1} impossible {selector}")
            for el in owner.locator(".dv-mobile-panel").all():
                if el.get_attribute("data-dv-panel")!=str(i) and el.is_visible():
                    failures.append(f"{width}px: panneau inactif visible {selector}")
            if not any(el.is_visible() for el in owner.locator(f'.dv-mobile-panel[data-dv-panel="{i}"]').all()):
                failures.append(f"{width}px: panneau actif vide {selector}")
        nav.locator("button").first.evaluate("el => el.click()")
        for i in range(1,count):
            pager.locator(".dv-mobile-pager-next").click()
            page.wait_for_timeout(180)
            if nav.locator("button").nth(i).get_attribute("aria-pressed")!="true":
                failures.append(f"{width}px: bouton suivant inopérant {selector}")
            if nav.evaluate("el => el.getBoundingClientRect().top < document.querySelector('.site-header').getBoundingClientRect().bottom - 2 || el.getBoundingClientRect().bottom > innerHeight"):
                failures.append(f"{width}px: navigation hors écran après suivant {selector}")
        if pager.locator(".dv-mobile-pager-next").is_visible():
            failures.append(f"{width}px: bouton suivant visible en fin {selector}")
        pager.locator(".dv-mobile-pager-prev").click()
        page.wait_for_timeout(180)
        if nav.locator("button").nth(count-2).get_attribute("aria-pressed")!="true":
            failures.append(f"{width}px: bouton précédent inopérant {selector}")
    if width<=760:
        page.evaluate("location.hash='#methode'")
        page.wait_for_timeout(200)
        if not page.locator("#methode").is_visible():
            failures.append(f"{width}px: lien direct vers la méthode inopérant")
        page.evaluate("location.hash='#faq'")
        page.wait_for_timeout(200)
        if not page.locator("#faq").is_visible():
            failures.append(f"{width}px: lien direct vers les questions inopérant")


def check_summary_contrast(page, width, failures):
    for summary in page.locator(".institutional-home main :is(.home-deep,.home-collapse,.home-small-extra,.home-more-info)>summary").all():
        if not summary.is_visible():
            continue
        ratio = summary.evaluate("""el => {
          function lum(rgb) {
            const a=rgb.match(/[0-9.]+/g).slice(0,3).map(x=>Number(x)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
            return .2126*a[0]+.7152*a[1]+.0722*a[2];
          }
          const bg=lum(getComputedStyle(el).backgroundColor);
          return Math.min(...[...el.children].map(n=>{const fg=lum(getComputedStyle(n).color);return (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05)}));
        }""")
        if ratio < 4.5:
            failures.append(f"{width}px: contraste insuffisant du panneau {summary.inner_text()} ({ratio:.2f})")
    if width <= 760:
        for image in page.locator("#admin-featured-publications .work-open>img").all():
            if image.is_visible() and image.bounding_box()["height"] > 115:
                failures.append(f"{width}px: couverture trop haute pour la liste compacte")

def check_opening(browser, width, failures):
    page=browser.new_page(viewport={"width":width,"height":850}, reduced_motion="no-preference")
    try:
        page.goto(BASE,wait_until="domcontentloaded",timeout=30000)
        intro=page.locator("#dv-opening")
        try:
            intro.wait_for(state="visible",timeout=2500)
        except Exception:
            failures.append(f"{width}px: introduction absente")
            return
        if not intro.locator("img").evaluate("el => el.complete && el.naturalWidth > 0"):
            intro.locator("img").evaluate("el => el.decode()")
        if intro.locator(".dv-opening-scene").evaluate("el => getComputedStyle(el).outlineStyle") != "none":
            failures.append(f"{width}px: cadre visible sur la scène d’introduction")
        intro.wait_for(state="hidden",timeout=5000)
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(200)
        if intro.is_visible():
            failures.append(f"{width}px: introduction rejouée dans la session")
    finally:
        page.close()
    page=browser.new_page(viewport={"width":width,"height":850}, reduced_motion="no-preference")
    try:
        page.goto(BASE,wait_until="domcontentloaded")
        page.locator("#dv-opening").wait_for(state="visible",timeout=2500)
        if page.locator("#dv-opening .dv-opening-skip").count():
            failures.append(f"{width}px: bouton Passer superflu")
        page.keyboard.press("Escape")
        page.locator("#dv-opening").wait_for(state="hidden",timeout=1000)
    finally:
        page.close()
    for motion, suffix in (("reduce",""),("no-preference","#methode")):
        page=browser.new_page(viewport={"width":width,"height":850}, reduced_motion=motion)
        try:
            page.goto(BASE+suffix,wait_until="domcontentloaded")
            page.wait_for_timeout(200)
            if page.locator("#dv-opening").is_visible():
                failures.append(f"{width}px: introduction non désactivée ({motion}, {suffix})")
        finally:
            page.close()


def check_world_watch(browser, width, failures):
    """Test the actual generated world-watch page, including its interactive map."""
    page = browser.new_page(viewport={"width": width, "height": 850})
    prefix = f"{width}px: monde sous vigilance"
    try:
        response = page.goto(BASE.rstrip("/") + "/points-information/monde/", wait_until="domcontentloaded", timeout=30000)
        if not response or response.status >= 400:
            failures.append(prefix + " indisponible")
            return
        cards = page.locator("[data-world-entry]")
        pins = page.locator("[data-world-pin]")
        total = cards.count()
        if total < 57 or pins.count() != total:
            failures.append(prefix + " registre ou repères incomplets")
            return
        if not page.locator("h1").first.is_visible():
            failures.append(prefix + " titre absent")
        if page.locator("main .ww-hero img").count() != 1 or not page.locator("main .ww-hero img").evaluate("el => el.decode().then(() => el.naturalWidth > 0).catch(() => false)"):
            failures.append(prefix + " visuel absent ou non chargé")
        if page.locator("link[rel=canonical]").get_attribute("href") != "https://diploval.fr/points-information/monde":
            failures.append(prefix + " URL canonique incorrecte")
        if page.locator('[data-world-alert="AFR-01"] .ww-level-1').count() != 1:
            failures.append(prefix + " Code One Soudan absent ou dupliqué")
        if page.locator('[data-world-alert]').count() != 1 or page.locator('.ww-pin-level-1').count() != 1:
            failures.append(prefix + " nouveaux niveaux non validés ou doublons")
        if page.locator('#ww-AFR-01 .ww-analysis a[href^="https://"]').count() < 3:
            failures.append(prefix + " sources Soudan insuffisantes")
        if page.locator('#ww-AFR-02 .ww-analysis a[href^="https://"]').count() < 2:
            failures.append(prefix + " sources Soudan du Sud insuffisantes")
        if "aucun niveau attribué" not in page.locator('#ww-AFR-02 .ww-state').inner_text():
            failures.append(prefix + " niveau Soudan du Sud attribué sans validation")
        page.locator('#ww-AFR-01 .ww-analysis summary').click()
        if not page.locator('#ww-AFR-01 .ww-analysis a').first.is_visible():
            failures.append(prefix + " sources non accessibles")
        page.locator('#ww-AFR-01 .ww-analysis summary').click()
        q = page.locator("#world-query")
        region = page.locator("#world-region")
        svg = page.locator("#ww-map")
        if cards.filter(visible=True).count() != total or svg.get_attribute("viewBox") != "0 0 720 360":
            failures.append(prefix + " vue initiale incorrecte")
        region.select_option("Afrique")
        africa = page.locator('[data-world-entry][data-region="Afrique"]').count()
        if cards.filter(visible=True).count() != africa or page.locator('[data-world-pin]:not(.ww-pin-hidden)').count() != africa:
            failures.append(prefix + " filtre géographique et repères désynchronisés")
        if svg.get_attribute("viewBox") == "0 0 720 360":
            failures.append(prefix + " zoom régional inopérant")
        q.fill("ethiopie")
        if cards.filter(visible=True).count() < 2 or cards.filter(visible=True).count() != page.locator('[data-world-pin]:not(.ww-pin-hidden)').count():
            failures.append(prefix + " recherche normalisée inopérante")
        q.fill("xyz-aucun-dossier-123")
        if cards.filter(visible=True).count() != 0:
            failures.append(prefix + " recherche vide incorrecte")
        page.locator("#world-reset").click()
        if cards.filter(visible=True).count() != total or svg.get_attribute("viewBox") != "0 0 720 360":
            failures.append(prefix + " réinitialisation inopérante")
        # A filtered map has a single marker for this exact reference.
        q.fill("AFR-01")
        pin = page.locator('[data-world-pin="AFR-01"]')
        if pin.count() == 1:
            pin.focus()
            page.keyboard.press("Enter")
            if page.evaluate("location.hash") != "#ww-AFR-01":
                failures.append(prefix + " navigation clavier du repère inopérante")
        else:
            failures.append(prefix + " repère de référence absent")
        page.locator("#world-reset").click()
        if page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2"):
            failures.append(prefix + " débordement horizontal")
        for selector in (".ww-hero", ".ww-map-shell", ".ww-controls", ".ww-register"):
            item = rect(page, selector)
            if not item or item["x"] < -2 or item["right"] > width + 2:
                failures.append(prefix + f" bloc hors écran {selector}: {item}")
        page.screenshot(path=f"layout-screenshots/{browser.browser_type.name}-monde-{width}px.png", full_page=True, animations="disabled")
        print(f"{browser.browser_type.name}: monde sous vigilance checked at {width}px")
    except Exception as exc:
        failures.append(prefix + f" erreur de contrôle: {exc}")
    finally:
        page.close()

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
                    page.add_init_script("sessionStorage.setItem('diploval-opening-v1','1')")
                    page.goto(BASE,wait_until="domcontentloaded",timeout=30000)
                    page.wait_for_timeout(1200)
                    if width in (344,390,1280):
                        page.screenshot(path=f"layout-screenshots/{engine.name}-accueil-{width}px.png",
                                        full_page=True, animations="disabled")
                    check(page,width,failures)
                    check_identity(page,width,failures)
                    check_home_modules(page,width,failures)
                    check_summary_contrast(page,width,failures)
                    check_mobile_navigation(page,width,failures)
                    print(f"{engine.name}: responsive layout checked at {width}px")
                    page.close()
                for width in (344, 1280):
                    check_public_pages(browser,width,failures)
                    check_world_watch(browser,width,failures)
                    check_opening(browser,width,failures)
                check_world_watch(browser,320,failures)
            finally:
                browser.close()
    if failures:
        for f in failures: print("ERROR:",f)
        raise SystemExit(f"{len(failures)} responsive layout regressions")
    print("Responsive layout OK: Chromium and Firefox, seven viewport widths, all sections and cards.")

if __name__ == "__main__":
    main()
