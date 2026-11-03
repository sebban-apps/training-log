"""Test end-to-end aplikacji w headless Chromium. Uruchamiany na serwerze http na porcie 8765."""
import datetime, sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:8765/index.html"
errors = []
results = []

def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{extra}]" if extra else ""))

today = datetime.date.today()
day_key = ["pon", "wt", "sr", "czw", "pt", "sob", "nd"][today.weekday()]

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, timezone_id="Europe/Warsaw", service_workers="block")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("dialog", lambda d: d.accept())
    pg.goto(URL); pg.wait_for_timeout(500)

    def nav(v): pg.click(f'.nav-btn[data-view="{v}"]'); pg.wait_for_timeout(250)
    def subtab(t): pg.click(f'[data-planner-tab="{t}"]'); pg.wait_for_timeout(250)

    # --- ćwiczenia
    nav("planner"); subtab("exercises")
    for name, typ, sprzet in [("Wyciskanie", "powtorzenia", True), ("Plank", "czas", False)]:
        pg.click("#planner-fab"); pg.fill("#f-ex-nazwa", name); pg.select_option("#f-ex-typ", typ)
        if sprzet: pg.check("#f-ex-sprzet")
        pg.click("#f-ex-save"); pg.wait_for_timeout(250)
    check("dodano 2 ćwiczenia", pg.locator("#exercises-list .list-item").count() == 2)

    # --- szablon z 2 ćwiczeniami i dzisiejszym dniem tygodnia; sprawdź że zmiana ćwiczenia nie kasuje innych wierszy
    subtab("templates"); pg.click("#planner-fab"); pg.fill("#f-tpl-nazwa", "Push")
    rows = pg.locator("#f-tpl-rows [data-row-id]")
    rows.nth(0).locator(".tpl-row-kg").fill("60")
    rows.nth(0).locator(".tpl-row-serie").fill("2")
    pg.click("#f-tpl-add-row"); pg.wait_for_timeout(100)
    check("dodanie wiersza nie kasuje kg w pierwszym", rows.nth(0).locator(".tpl-row-kg").input_value() == "60")
    rows.nth(1).locator(".tpl-row-ex").select_option(label="Plank"); pg.wait_for_timeout(100)
    check("zmiana ćwiczenia nie kasuje kg w innym wierszu", rows.nth(0).locator(".tpl-row-kg").input_value() == "60")
    check("plank pokazuje pole czasu", "czas" in rows.nth(1).inner_text().lower())
    rows.nth(1).locator(".tpl-row-cel").fill("45"); rows.nth(1).locator(".tpl-row-serie").fill("1")
    pg.click(f'.day-toggle[data-day="{day_key}"]')
    pg.click("#f-tpl-save"); pg.wait_for_timeout(500)

    sched = pg.evaluate("DB.getAll('scheduled_sessions')")
    auto_dates = sorted(s["data"] for s in sched)
    check("dni tygodnia utworzyły wpisy w planie", len(sched) == 4 and auto_dates[0] == today.isoformat(), auto_dates)

    # usunięty dzień nie wraca przy kolejnym starcie
    second = [s for s in sched if s["data"] == auto_dates[1]][0]
    pg.evaluate(f"DB.remove('scheduled_sessions', {second['id']})")
    pg.reload(); pg.wait_for_timeout(600)
    n = len(pg.evaluate("DB.getAll('scheduled_sessions')"))
    check("ręcznie usunięty dzień nie wraca po restarcie", n == 3, n)

    # --- dashboard: Rozpocznij od razu startuje sesję
    nav("dashboard")
    check("dashboard pokazuje dzisiejszy Push", "Push" in pg.inner_text("#dash-today-card"))
    pg.click("#dash-start-today"); pg.wait_for_timeout(400)
    check("Rozpocznij uruchamia sesję", pg.is_visible("#active-session") and pg.inner_text("#active-session-name").lower() == "push")
    check("sesja ma 2 ćwiczenia i 3 serie", pg.locator("#active-exercise-list .set-row[data-set]").count() == 3)

    # wpisz dane i przeładuj stronę (symulacja ubicia aplikacji)
    pg.locator(".set-kg").nth(0).fill("62.5")
    pg.locator(".set-cel").nth(0).fill("8")
    pg.locator(".set-cel").nth(2).fill("50")
    pg.reload(); pg.wait_for_timeout(700)
    check("po przeładowaniu wraca do aktywnego treningu", pg.is_visible("#active-session"))
    check("wpisany ciężar przetrwał przeładowanie", pg.locator(".set-kg").nth(0).input_value() == "62.5")
    check("wpisany czas przetrwał przeładowanie", pg.locator(".set-cel").nth(2).input_value() == "50")

    # + Seria kopiuje poprzednią
    pg.locator(".add-set-btn").nth(0).click(); pg.wait_for_timeout(100)
    check("nowa seria kopiuje ciężar poprzedniej", pg.locator(".set-kg").nth(2).input_value() == "60")

    pg.click("#btn-finish-session"); pg.wait_for_timeout(500)
    hist = pg.evaluate("DB.getAll('history_entries')")
    check("trening zapisany w historii", len(hist) == 1)
    s0 = hist[0]["cwiczenia"][0]["serie"][0]
    check("seria zapisana poprawnie", s0["kg"] == 62.5 and s0["powt"] == 8, s0)
    check("plank zapisany jako czas", hist[0]["cwiczenia"][1]["serie"][0]["czas"] == 50)
    check("localStorage wyczyszczony po zapisie", pg.evaluate("localStorage.getItem('dziennik.activeSession')") is None)
    st = [s for s in pg.evaluate("DB.getAll('scheduled_sessions')") if s["data"] == today.isoformat()][0]["status"]
    check("wpis w planie oznaczony jako wykonany", st == "wykonana", st)

    # --- jednostki lb
    nav("profile"); pg.select_option("#setting-units", "lb"); pg.wait_for_timeout(400)
    nav("dashboard")
    vol_kg = 62.5 * 8 + 60 * 10 + 60 * 10
    shown = pg.inner_text("#dash-week-volume").replace("\xa0", "").replace(" ", "")
    check("dashboard pokazuje lb", "lb" in pg.inner_text("#dash-week-volume-label").lower() and int(shown) == round(vol_kg / 0.45359237), shown)

    # --- historia w lb, edycja planku (czas) i ciężaru
    nav("history")
    check("rekord w lb", "138 lb" in pg.inner_text("#pr-list"), pg.inner_text("#pr-list"))
    pg.locator("[data-edit-hist]").first.click(); pg.wait_for_timeout(300)
    kg0 = pg.locator("#sheet-body .h-kg").nth(0)
    check("edycja pokazuje ciężar w lb", kg0.input_value() == "138", kg0.input_value())
    kg0.fill("135")
    pg.locator("#sheet-body .h-cel").nth(3).fill("75")  # plank (wiersz 4: 3 serie wyciskania + plank)
    pg.click("#f-hist-save"); pg.wait_for_timeout(400)
    h = pg.evaluate("DB.getAll('history_entries')")[0]
    check("edycja ciężaru w lb zapisuje kg", abs(h["cwiczenia"][0]["serie"][0]["kg"] - 61.235) < 0.01, h["cwiczenia"][0]["serie"][0]["kg"])
    pl = h["cwiczenia"][1]["serie"][0]
    check("edycja planku zapisuje czas, nie powtórzenia", pl["czas"] == 75 and pl["powt"] is None, pl)

    # stary wpis bez typ_pomiaru i z pustym czasem (dokładnie ten błąd z oryginału)
    ex_ids = {e["nazwa"]: e["id"] for e in pg.evaluate("DB.getAll('exercises')")}
    pg.evaluate(f"""DB.add('history_entries', {{data:'2026-10-01', nazwa_treningu:'Stary', czas_trwania:60,
        cwiczenia:[{{exercise_id:{ex_ids['Plank']}, serie:[{{powt:null, czas:null, kg:null}}]}}]}})""")
    nav("profile"); nav("history")
    pg.locator("[data-edit-hist]").last.click(); pg.wait_for_timeout(300)
    pg.locator("#sheet-body .h-cel").nth(0).fill("30"); pg.click("#f-hist-save"); pg.wait_for_timeout(400)
    old = [e for e in pg.evaluate("DB.getAll('history_entries')") if e["nazwa_treningu"] == "Stary"][0]["cwiczenia"][0]["serie"][0]
    check("pusta seria na czas w starym wpisie zapisuje się jako czas", old["czas"] == 30 and old["powt"] is None, old)

    # --- timer przerwy liczony od znacznika czasu
    nav("timer"); pg.click('[data-timer-tab="rest"]'); pg.click('[data-rest-preset="60"]')
    pg.click("#btn-rest-toggle"); pg.wait_for_timeout(2300)
    disp = pg.inner_text("#rest-display")
    check("timer przerwy odlicza", disp in ("00:58", "00:57"), disp)
    pg.click("#btn-rest-toggle"); paused = pg.inner_text("#rest-display"); pg.wait_for_timeout(1200)
    check("pauza zatrzymuje timer", pg.inner_text("#rest-display") == paused)

    # --- usunięcie szablonu sprząta przyszłe wpisy
    nav("planner"); subtab("templates"); pg.locator("[data-del-tpl]").first.click(); pg.wait_for_timeout(400)
    left = [s for s in pg.evaluate("DB.getAll('scheduled_sessions')") if s["status"] == "zaplanowana"]
    check("usunięcie szablonu zdejmuje przyszłe wpisy z planu", len(left) == 0, left)

    pg.screenshot(path="e2e-screenshot.png")
    b.close()

check("brak błędów w konsoli", not errors, errors)
failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} OK")
sys.exit(1 if failed else 0)
