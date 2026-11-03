# Dziennik Treningowy, dokumentacja techniczna

## Przegląd

Aplikacja jest statyczną stroną PWA w czystym HTML, CSS i JavaScript, bez frameworków i bez kroku budowania. Dane trzyma w IndexedDB przeglądarki, a service worker zapisuje pliki aplikacji w cache, dzięki czemu działa offline.

Interfejs korzysta z systemu wizualnego **Modern Teal Signature** (paleta teal, Manrope i Inter, jasny i ciemny motyw), tego samego co Dziennik nauki.

Kod jest podzielony na moduły ładowane zwykłymi tagami `<script>` w stałej kolejności. Każdy moduł wystawia jeden obiekt w `window`.

| Moduł | Obiekt | Rola |
|---|---|---|
| `js/db.js` | `DB` | Warstwa nad IndexedDB (add, put, get, getAll, remove, eksport, import, czyszczenie) |
| `js/utils.js` | `WorkoutUtils` | Czyste funkcje bez DOM i bazy (daty, statystyki, kalendarz, jednostki, harmonogram cykliczny) |
| `js/ui.js` | `UI` | Arkusz z formularzem, powiadomienia, kalendarz, stan ładowania przycisków, aktualna jednostka |
| `js/planner.js` | `Planner` | Ćwiczenia, sprzęt, szablony treningów, harmonogram i jego automatyczne uzupełnianie |
| `js/timer.js` | `Timer` | Start treningu, aktywna sesja zapisywana na bieżąco, timer przerwy |
| `js/dashboard.js` | `Dashboard` | Panel Start |
| `js/history.js` | `History` | Kalendarz, rekordy, log i edycja wpisów |
| `js/profile.js` | `Profile` | Ustawienia, motyw, kopia zapasowa |
| `js/app.js` | `App` | Start aplikacji, nawigacja, rejestracja service workera |

`db.js` i `utils.js` działają też w Node (eksportują `module.exports`), żeby dało się je testować bez przeglądarki.

## Technologie i zależności

* HTML, CSS i JavaScript (ES2020), bez bibliotek uruchomieniowych
* IndexedDB do danych, `localStorage` tylko do zapisu trwającej sesji i kopii ustawienia motywu
* Service worker z cache plików (`sw.js`)
* Fonty Inter i Manrope (wersje zmienne, zestawy znaków latin i latin-ext, licencja SIL OFL 1.1) trzymane w folderze `fonts/`, żeby działały offline

Zależności deweloperskie są opcjonalne i potrzebne tylko do testów (Node 20+, Python 3 z Playwrightem).

## Wymagania

**Wymagane**

* Serwer plików statycznych z HTTPS (GitHub Pages) albo `localhost`. Service worker i instalacja PWA nie działają z `file://`.
* Nowoczesna przeglądarka (Chrome, Edge, Firefox, Safari z ostatnich lat).

**Niewymagane**

* Brak zmiennych środowiskowych, kluczy API, zewnętrznych usług i bazy danych po stronie serwera.

## Uruchomienie lokalne

```bash
cd sciezka/do/training-log
python3 -m http.server 8000
# otwórz http://localhost:8000/
```

Podczas pracy nad kodem w Chrome warto włączyć w DevTools (zakładka Application, sekcja Service workers) opcję **Update on reload**. Inaczej service worker poda starą wersję plików z cache.

## Struktura plików

```text
index.html              cały szkielet HTML i sprite ikon SVG
manifest.json           manifest PWA (nazwa, ikony, kolory, start_url)
sw.js                   service worker i lista plików do cache
css/style.css           tokeny Modern Teal Signature i wszystkie style
js/                     moduły aplikacji (tabela wyżej)
fonts/                  Inter i Manrope w woff2 oraz ich licencje
icons/                  ikony 192, 512 i maskable 512
tests/utils.test.js     testy jednostkowe (Node)
tests/manifest.test.js  walidacja manifestu i tożsamości PWA (Node)
tests/e2e.py            test całej aplikacji w przeglądarce (Playwright)
tests/pwa_install.py    test instalacji kilku PWA z jednej domeny (Playwright)
package.json            skrypt npm test
README.md               instrukcja dla użytkownika
KONFIGURACJA.md         ten plik
```

## Model danych

Baza IndexedDB `workoutTrackerDB`, wersja 1. Wszystkie magazyny mają klucz `id`.

| Magazyn | Zawartość | Ważne pola |
|---|---|---|
| `exercises` | Biblioteka ćwiczeń | `nazwa`, `kategoria`, `typ_pomiaru` (`powtorzenia` lub `czas`), `wymaga_sprzetu` |
| `equipment` | Sprzęt | `nazwa`, `typ` |
| `templates` | Gotowe treningi | `cwiczenia[]`, `dni_tygodnia[]` (`pon` … `nd`), `zaplanowano_do` (data ISO, do której wygenerowano harmonogram) |
| `scheduled_sessions` | Harmonogram | `data`, `template_id`, `status` (`zaplanowana`, `pominięta`, `wykonana`), `auto` (wpis z dni tygodnia) |
| `history_entries` | Wykonane treningi | `data`, `nazwa_treningu`, `czas_trwania` (s), `cwiczenia[].typ_pomiaru`, `cwiczenia[].serie[]` |
| `settings` | Jeden rekord `id: 1` | `jednostki` (`kg`, `lb`), `motyw` (`systemowy`, `jasny`, `ciemny`), `cel_tygodniowy` |

**Ciężar jest zawsze zapisany w kilogramach.** Przeliczanie na funty dzieje się tylko w interfejsie (`UI.kgOut`, `UI.kgIn`), więc zmiana jednostki nie zmienia danych.

Starsze wpisy historii mogą nie mieć `typ_pomiaru`. Wtedy typ brany jest z biblioteki ćwiczeń, a gdy ćwiczenia już nie ma, z tego, czy seria ma wpisany czas.

## Ważne parametry

| Gdzie | Parametr | Znaczenie |
|---|---|---|
| `sw.js` | `CACHE_NAME` | Nazwa cache. Zmień przy każdym wydaniu, inaczej telefony zostaną na starej wersji |
| `sw.js` | `ASSETS` | Pliki zapisywane w cache przy instalacji. Nowy plik musi trafić na tę listę |
| `js/db.js` | `DB_VERSION` | Wersja schematu bazy. Podbij przy nowym magazynie lub indeksie i obsłuż migrację w `onupgradeneeded` |
| `js/planner.js` | `RECURRING_HORIZON_DAYS` | Na ile dni do przodu generować treningi z dni tygodnia (domyślnie 28) |
| `js/timer.js` | `SESSION_KEY` | Klucz `localStorage` z trwającym treningiem (`dziennik.activeSession`) |
| `index.html`, `js/profile.js` | `dziennik.theme` | Kopia wybranego motywu w `localStorage`, czytana przed pierwszym rysowaniem strony |
| `manifest.json` | `id`, `start_url`, `scope` | Tożsamość instalacji PWA. **Nie zmieniać**, szczegóły w sekcji niżej |

## Tożsamość aplikacji PWA

Aplikacja działa pod adresem `https://sebban-apps.github.io/training-log/`. Na tej samej domenie są też Dziennik nauki (`/Journal-PWA/`) i Kalendarz nawyków (`/Calendar-PWA/`), dlatego każda z nich musi mieć własną, stałą tożsamość instalacji.

| Pole | Wartość | Po rozwiązaniu |
|---|---|---|
| `id` | `/training-log/index.html` | `https://sebban-apps.github.io/training-log/index.html` |
| `start_url` | `./index.html` | `https://sebban-apps.github.io/training-log/index.html` |
| `scope` | `./` | `https://sebban-apps.github.io/training-log/` |

**Dlaczego `id` jest pełną ścieżką.** Chrome rozwiązuje `id` względem samej domeny, a nie folderu z manifestem. Zapis `./index.html` dałby `https://sebban-apps.github.io/index.html`, czyli tożsamość, którą mógłby przypadkiem dostać każdy inny projekt z tej domeny. Sprawdzone w Chromium.

**Dlaczego właśnie ta wartość.** Wcześniej manifest nie miał `id`, więc Chrome wyliczał tożsamość ze `start_url`. Wpisana wartość jest identyczna z tamtą, więc już zainstalowane kopie są dalej rozpoznawane jako ta sama aplikacja i nic się nie duplikuje.

**Zasady na przyszłość**

* Nie zmieniaj `id`, nawet przy zmianie nazwy, ikon albo pliku startowego. Zmiana `id` sprawi, że Chrome potraktuje aplikację jako nową i obok starej instalacji pojawi się druga.
* `scope` obejmuje tylko folder `training-log/`, więc nie przechwytuje linków do innych projektów z domeny.
* Zmiana nazwy repozytorium albo przeniesienie na inną domenę zmienia adres, a dane w przeglądarce są przypisane do domeny. Taka zmiana wymaga przeniesienia danych kopią zapasową i nowej instalacji.
* Nowy projekt na tej samej domenie musi mieć własne `id` z własnym folderem (np. `/nowy-projekt/index.html`), nigdy skopiowane z tego pliku.

**Przeniesienie z `sebban03` do `sebban-apps`.** Repozytorium było wcześniej pod adresem `sebban03.github.io/training-log/`. To inna domena, więc tamta instalacja jest osobną aplikacją z osobnymi danymi i nowy manifest jej nie usunie ani nie przejmie. Dane z niej trzeba wyeksportować w starej aplikacji (Profil, Eksportuj kopię) i zaimportować w nowej, a starą instalację odinstalować ręcznie.

## System wizualny

Wszystkie kolory, promienie, odstępy, czasy animacji i fonty są tokenami na początku `css/style.css`. Nazwy tokenów są takie same jak w Dzienniku nauki (`--bg`, `--surface`, `--elevated`, `--text`, `--accent`, `--r-card`, `--s4` i tak dalej).

Motyw działa przez atrybut `data-theme` na elemencie `<html>`.

* `data-theme="light"` lub `"dark"` wymusza motyw.
* Brak atrybutu oznacza motyw systemowy (`prefers-color-scheme`).

Nowe elementy interfejsu powinny korzystać z istniejących tokenów i klas (`.card`, `.btn`, `.field`, `.list-item`, `.empty-state`), a nie z własnych kolorów. Przycisk w trakcie zapisu dostaje stan ładowania przez `UI.withLoading(button, asyncFn)`. Powiadomienie z kolorem znaczenia to `UI.showToast(tekst, 'success' | 'error')`.

Od szerokości 960 px nawigacja przechodzi z dołu na lewą szynę, a arkusz z formularzem staje się oknem na środku ekranu.

## Testy

**Testy jednostkowe i manifestu**

```bash
npm test
```

Sprawdzają funkcje z `js/utils.js` oraz `manifest.json` (wymagane pola, stałe `id`, `start_url` w `scope`, zakres nieobejmujący innych projektów z domeny, istnienie i rozmiary ikon, odwołanie z `index.html`, kompletność listy plików w `sw.js`). Wymagany Node 20 lub nowszy, bez instalowania pakietów.

**Test całej aplikacji** w przeglądarce headless sprawdza dodawanie ćwiczeń i treningów, harmonogram z dni tygodnia, start z panelu Start, przywracanie sesji po przeładowaniu, zapis do historii, jednostki, edycję wpisów, timer przerwy, przełączanie motywu, wczytanie lokalnych fontów i brak błędów w konsoli.

```bash
pip install playwright
python3 -m playwright install chromium

# terminal 1, w folderze aplikacji
python3 -m http.server 8765

# terminal 2, w folderze aplikacji
python3 tests/e2e.py
```

Na końcu test zapisuje zrzut ekranu `e2e-screenshot.png`. Nie dodawaj go do repozytorium.

**Test instalacji obok innych aplikacji** odtwarza układ GitHub Pages lokalnie. Wymaga folderu, w którym obok siebie leżą `training-log/`, `Journal-PWA/` i `Calendar-PWA/`. Instaluje wszystkie trzy w Chromium, sprawdza, że mają różne `id`, i uruchamia każdą, sprawdzając, czy otwiera się właściwy projekt.

```bash
# w folderze nadrzędnym z trzema projektami
python3 -m http.server 8766
python3 training-log/tests/pwa_install.py
```

**Po wdrożeniu** sprawdź prawdziwy adres w Chrome na komputerze. W DevTools otwórz zakładkę Application, sekcję Manifest. Pole **Computed App Id** musi pokazywać `https://sebban-apps.github.io/training-log/index.html`, a lista błędów ma być pusta.

## Publikacja na GitHub Pages

1. Wrzuć zawartość folderu do katalogu głównego repozytorium `sebban-apps/training-log`, zachowując foldery `css/`, `js/`, `fonts/`, `icons/` i `tests/`.
2. W repozytorium wejdź w **Settings → Pages** i wybierz gałąź `main` oraz folder `/ (root)`.
3. Aplikacja jest dostępna pod `https://sebban-apps.github.io/training-log/`.

Ścieżki do plików są względne (`./`), więc aplikacja działa w podfolderze. Wyjątkiem jest `id` w manifeście, celowo przypięte do `/training-log/`.

Pliki JS, CSS i ikony leżą tylko w swoich folderach. Luźne kopie tych plików w korzeniu repozytorium (np. `app.js`, `style.css`, `icon-192.png`) nie są używane i można je usunąć.

## Aktualizacje i wersje

1. Wprowadź zmiany i uruchom testy.
2. Podbij `CACHE_NAME` w `sw.js` (na przykład z `v3` na `v4`).
3. Jeśli doszedł nowy plik, dopisz go do `ASSETS`.
4. Jeśli zmienia się schemat bazy, podbij `DB_VERSION` i dodaj migrację. Nie usuwaj magazynów z danymi użytkownika.
5. Wypchnij zmiany. Telefon pobierze nową wersję w tle i pokaże ją przy kolejnym uruchomieniu.

## Rozwiązywanie problemów

**Po aktualizacji widać starą wersję.** Zamknij aplikację całkiem i otwórz ponownie. Jeśli to nie pomaga, sprawdź, czy `CACHE_NAME` został zmieniony.

**Komunikat „Ta aplikacja jest już zainstalowana” albo otwiera się inna aplikacja.** Dwa projekty mają ten sam `id` albo zachodzące na siebie `scope`. Porównaj **Computed App Id** w DevTools obu aplikacji i uruchom `npm test`.

**Brak przycisku instalacji.** Strona musi być otwarta przez HTTPS lub `localhost`, a `manifest.json` i ikony muszą się poprawnie wczytać (DevTools, zakładka Application, sekcja Manifest).

**Dane zniknęły.** Dane leżą w przeglądarce, więc wyczyszczenie danych witryny je usuwa. Jedynym ratunkiem jest import kopii zapasowej. Na iPhonie dane w Safari i w zainstalowanej aplikacji są oddzielne.

**Trening wrócił po zamknięciu aplikacji, choć miał być anulowany.** Sesja jest usuwana z `localStorage` dopiero po kliknięciu **Anuluj** lub **Zakończ i zapisz**. Zamknięcie aplikacji celowo jej nie usuwa.

**Treningi z dni tygodnia się nie pojawiają.** Harmonogram uzupełnia się przy starcie aplikacji i przy zapisie szablonu ze zmienionymi dniami. W dzień, w którym jest już inny wpis, nic nie jest dokładane.
