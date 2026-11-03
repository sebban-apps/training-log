"""Instaluje 3 PWA z jednej domeny przez CDP (domena PWA) i sprawdza, czy są osobne i otwierają właściwy projekt."""
import json, tempfile
from playwright.sync_api import sync_playwright
BASE = "http://localhost:8766"
APPS = {"training-log": "/training-log/index.html", "Journal-PWA": "/Journal-PWA/dziennik-nauki.html",
        "Calendar-PWA": "/Calendar-PWA/kalendarz-nawykow.html"}
ok = True
with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(tempfile.mkdtemp(), channel="chromium", headless=True)
    ids = {}
    for name, path in APPS.items():
        pg = ctx.new_page(); cdp = ctx.new_cdp_session(pg); cdp.send("Page.enable")
        pg.goto(BASE + path); pg.wait_for_timeout(1200)
        man = cdp.send("Page.getAppManifest")
        ids[name] = (man.get("manifest") or {}).get("id")
        errs = [e["errorId"] for e in cdp.send("Page.getInstallabilityErrors")["installabilityErrors"]]
        try:
            cdp.send("PWA.install", {"manifestId": ids[name]})
            installed = "zainstalowano"
        except Exception as e:
            installed = f"błąd instalacji: {str(e)[:120]}"; ok = False
        print(f"{name:13} id={ids[name]}  installability={errs or 'OK'}  {installed}")
    print("unikalne id:", len(set(ids.values())) == len(ids))
    ok = ok and len(set(ids.values())) == len(ids)
    # stan w systemie i uruchomienie każdej aplikacji
    browser_cdp = ctx.new_cdp_session(ctx.pages[0])
    for name, mid in ids.items():
        try:
            st = browser_cdp.send("PWA.getOsAppState", {"manifestId": mid})
            r = browser_cdp.send("PWA.launch", {"manifestId": mid})
            ctx.pages[-1].wait_for_timeout(1200)
            target_url = next((pg.url for pg in ctx.pages if APPS[name].split('/')[1] in pg.url and pg.url.startswith(BASE)), None)
            infos = browser_cdp.send("Target.getTargetInfo", {"targetId": r["targetId"]})["targetInfo"]
            right = infos["url"].startswith(BASE + "/" + APPS[name].split('/')[1] + "/")
            ok = ok and right
            print(f"{name:13} uruchomienie -> {infos['url']}  {'OK' if right else 'ZŁY PROJEKT'}")
        except Exception as e:
            print(f"{name:13} launch: {str(e)[:150]}"); ok = False
    ctx.close()
print("WYNIK:", "OK" if ok else "PROBLEM")
