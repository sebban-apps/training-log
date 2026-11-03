# Dziennik Treningowy

Aplikacja do planowania i zapisywania treningów, która działa w przeglądarce telefonu jak zwykła aplikacja. Dane zostają na Twoim urządzeniu, a po pierwszym otwarciu wszystko działa bez internetu.

**Otwórz aplikację** https://sebban-apps.github.io/training-log/

## Co potrafi

* Prowadzi bibliotekę ćwiczeń (na powtórzenia albo na czas, ze sprzętem albo z masą własną ciała).
* Pozwala ułożyć gotowe treningi z ćwiczeń, z docelową liczbą serii, powtórzeń lub czasu i ciężarem.
* Sama planuje treningi w kalendarzu, jeśli przypiszesz im dni tygodnia.
* Prowadzi trening na żywo z zegarem, wpisywaniem serii i timerem przerwy.
* Zapisuje historię, liczy passę dni z rzędu, objętość tygodnia i rekordy życiowe.
* Działa w kilogramach albo funtach, w jasnym albo ciemnym motywie.

## Panele

| Panel | Do czego służy |
|---|---|
| **Start** | Passa, liczba treningów, objętość i cel tygodnia, dzisiejszy trening i ostatnie sesje |
| **Timer** | Start treningu z planu albo bez planu, aktywna sesja i timer przerwy |
| **Plan** | Treningi, harmonogram, ćwiczenia i sprzęt |
| **Historia** | Kalendarz, rekordy życiowe i log treningów z edycją |
| **Profil** | Jednostki, motyw, cel tygodniowy i kopia zapasowa |

## Jak zacząć

1. W panelu **Plan** otwórz zakładkę **Ćwiczenia** i dodaj ćwiczenia przyciskiem **+**. Przy każdym wybierz, czy liczysz powtórzenia, czy czas.
2. Jeśli używasz sprzętu, dodaj go w zakładce **Sprzęt**. To krok opcjonalny.
3. W zakładce **Treningi** utwórz trening. Wybierz ćwiczenia, liczbę serii, powtórzenia lub czas i ewentualny ciężar.
4. Zaznacz dni tygodnia, jeśli trening ma się powtarzać. Aplikacja wpisze go do harmonogramu na najbliższe 4 tygodnie, a przy każdym uruchomieniu dopisze kolejne dni.
5. Pojedynczy trening na konkretny dzień zaplanujesz w zakładce **Harmonogram**, stukając w dzień kalendarza.

## Podczas treningu

* Trening zaplanowany na dziś uruchomisz przyciskiem **Rozpocznij** na Starcie. Każdy inny gotowy trening startuje z panelu **Timer**. Tam jest też trening bez planu.
* Wpisuj powtórzenia (albo sekundy) i ciężar dla każdej serii. Przycisk **Seria** dodaje kolejną z wartościami skopiowanymi z poprzedniej.
* Ćwiczenie spoza planu dodasz przyciskiem **Ćwiczenie** w górnej karcie.
* **Timer przerwy** ma gotowe czasy 60, 90, 120 i 180 sekund. Liczy poprawnie także przy zablokowanym ekranie, a na końcu przerwy telefon z Androidem zawibruje.
* Możesz bez obaw przełączyć się na inną aplikację albo ją zamknąć. Wpisane serie są zapisywane na bieżąco, a po ponownym otwarciu wracasz prosto do trwającego treningu.
* **Zakończ i zapisz trening** przenosi sesję do historii.

## Kalendarz

Kolory dni są takie same w harmonogramie i w historii.

* Pełny kolor teal oznacza trening wykonany.
* Przerywana ramka oznacza trening zaplanowany.
* Czerwonawe tło oznacza trening pominięty.

Stuknięcie w zaplanowany dzień pozwala oznaczyć go jako pominięty, przywrócić albo usunąć z planu. Stuknięcie w dzień w historii otwiera szczegóły treningu do poprawienia.

## Instalacja na telefonie

### Android (Chrome)

1. Otwórz link do aplikacji.
2. Chrome sam zaproponuje „Zainstaluj aplikację” (albo wybierz menu ⋮ i tę opcję).
3. Zatwierdź. Ikona pojawi się na ekranie głównym, a aplikacja otworzy się na pełnym ekranie.

### iPhone (Safari)

1. Otwórz link w Safari.
2. Stuknij ikonę **Udostępnij** (kwadrat ze strzałką).
3. Wybierz **Dodaj do ekranu początkowego** i zatwierdź.

### Masz zainstalowaną wersję ze starego adresu?

Aplikacja przeniosła się z `sebban03.github.io/training-log` pod adres podany wyżej. Stara instalacja jest dla telefonu osobną aplikacją z osobnymi danymi i sama się nie przeniesie.

1. Otwórz starą aplikację i w panelu **Profil** stuknij **Eksportuj kopię (JSON)**.
2. Zainstaluj aplikację z nowego adresu.
3. W nowej aplikacji w panelu **Profil** stuknij **Importuj kopię** i wybierz zapisany plik.
4. Gdy wszystko się zgadza, odinstaluj starą aplikację.

Na iPhonie dane w karcie Safari i w aplikacji z ikony mogą być oddzielne. Zainstaluj więc aplikację, zanim zaczniesz wpisywać dane, albo przenieś je kopią zapasową.

## Telefon i komputer

Na telefonie nawigacja jest na dole ekranu, a formularze wysuwają się od dołu. Na komputerze nawigacja przechodzi na lewy bok, a formularze otwierają się w oknie na środku ekranu.

## Praca bez internetu

Po pierwszym otwarciu aplikacja zapisuje swoje pliki w telefonie i działa całkowicie offline. Nowa wersja pobiera się w tle, gdy masz internet, i pojawia się przy kolejnym uruchomieniu.

## Ustawienia

W panelu **Profil** wybierzesz trzy rzeczy.

* **Jednostki** to kilogramy albo funty. Zmiana nie psuje zapisanych danych, aplikacja tylko przelicza je do wyświetlania.
* **Motyw** może być jasny, ciemny albo taki jak w telefonie.
* **Cel tygodniowy** to liczba treningów, które chcesz zrobić w tygodniu.

## Twoje dane i kopia zapasowa

Ćwiczenia, treningi i historia są trzymane **tylko na tym urządzeniu i w tej przeglądarce**. Nic nie trafia na serwer i nic nie synchronizuje się samo.

* **Eksportuj kopię (JSON)** pobiera plik z całą bazą. Rób to co jakiś czas, bo wyczyszczenie danych przeglądarki bez kopii oznacza utratę wszystkiego.
* **Importuj kopię** wczytuje wcześniej zapisany plik, na przykład na nowym telefonie. Import zastępuje obecne dane.
* **Usuń wszystkie dane** czyści bazę od zera. Tego nie da się cofnąć.

## Ograniczenia

* Brak synchronizacji między urządzeniami. Dane przenosisz kopią zapasową.
* W jednym dniu harmonogramu może być jeden zaplanowany trening.
* Wibracja na koniec przerwy działa tylko tam, gdzie przeglądarka ją obsługuje (na iPhonie nie działa).
* Objętość tygodnia liczy tylko ćwiczenia z ciężarem i powtórzeniami. Ćwiczenia na czas się do niej nie wliczają.
