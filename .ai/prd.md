# Dokument wymagań produktu (PRD) - HealthyMeal

## 1. Przegląd produktu

HealthyMeal to webowa aplikacja MVP, która wspiera użytkowników w adaptowaniu istniejących przepisów kulinarnych do ich indywidualnych potrzeb żywieniowych. Łączy proste zarządzanie przepisami (zapisywanie, edycję, przeglądanie, trwałe usuwanie) z integracją AI umożliwiającą modyfikację receptur według zadeklarowanych preferencji dietetycznych. System kont użytkowników zapewnia powiązanie danych z konkretną osobą oraz przechowywanie jej preferencji.

## 2. Problem użytkownika

Użytkownicy, którzy chcą korzystać z dostępnych w sieci przepisów, napotykają trudności w dostosowaniu ich do restrykcji dietetycznych, alergii lub stylu życia. Ręczne wyszukiwanie alternatywnych składników zajmuje czas i wymaga wiedzy. HealthyMeal automatyzuje ten proces, oferując spersonalizowane przepisy dopasowane do zdefiniowanych preferencji żywieniowych.

## 3. Wymagania funkcjonalne

1. Konta użytkowników
   1.1. Rejestracja nowego konta.
   1.2. Logowanie i bezpieczne zarządzanie sesją.
   1.3. Usunięcie konta usuwa natychmiast wszystkie dane użytkownika (profil, przepisy).
2. Profil użytkownika
   2.1. Formularz edycji z wielokrotnym wyborem preferencji dietetycznych z zamkniętej listy: wegetarianizm, weganizm, bezglutenowa, cukrzyca, alergia na orzechy, low-FODMAP.
   2.2. Zapis i aktualizacja preferencji bez priorytetyzacji.
   2.3. Opcja usuwania konta
3. Zarządzanie przepisami
   3.1. Dodanie przepisu: pola title (≤ 50 znaków) i content (≤ 10 000 znaków) z walidacją znaków i licznikami.
   3.2. Edycja przepisu nadpisuje poprzednią wersję (brak wersjonowania).
   3.3. Trwałe usunięcie przepisu (hard delete).
   3.4. Lista przepisów użytkownika oraz widok szczegółów pojedynczego przepisu.
4. Integracja AI
   4.1. Przesłanie przepisu do AI w celu dostosowania do preferencji.
   4.2. Prezentacja zmodyfikowanego przepisu użytkownikowi.
   4.3. Akceptacja zapisuje zmienioną wersję, odrzucenie porzuca wynik.
5. Analityka
   5.1. Zdarzenie recipe_saved: timestamp aktualizowany wyłącznie przy tworzeniu nowego przepisu.
6. Walidacja i UX
   6.1. Komunikaty błędów przy przekroczeniu limitów znaków.
   6.2. Licznik pozostałych znaków w polu body.
7. Zależności i ograniczenia techniczne
   7.1. Wykorzystanie wyłącznie darmowych modeli AI na potrzeby MVP.
   7.2. Brak obsługi multimediów oraz importu przepisów z URL.
   7.3. Brak wymagań WCAG i szyfrowania treści przepisu w MVP.

## 4. Granice produktu

- Import z URL, multimedia, funkcje społecznościowe i udostępnianie są poza zakresem MVP.
- Brak wersjonowania przepisów; każda edycja nadpisuje treść.
- Usunięcie przepisów i kont jest nieodwracalne.
- Budżet na AI ograniczony do darmowych planów.
- Brak onboardingów oraz formalnych wymogów dostępności WCAG na etapie MVP.

## 5. Historyjki użytkowników

| ID     | Tytuł                             | Opis                                                                                                  | Kryteria akceptacji                                                                                                                                                                                                                                                          |
| ------ | --------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-001 | Rejestracja konta                 | Jako nowy użytkownik chcę utworzyć konto, aby zapisywać własne przepisy.                              | 1. Formularz wymaga unikalnego loginu i hasła. 2. Po poprawnym wypełnieniu konto zostaje utworzone, a użytkownik zostaje zalogowany. 3. Błędne dane wyświetlają komunikaty walidacyjne.                                                                                      |
| US-002 | Logowanie                         | Jako użytkownik chcę zalogować się na swoje konto, aby uzyskać dostęp do przepisów i profilu.         | 1. Poprawne dane uwierzytelniają i przekierowują do panelu. 2. Błędne dane wyświetlają komunikat o niepowodzeniu. 3. Sesja pozostaje aktywna min. 24 h lub do wylogowania.                                                                                                   |
| US-003 | Ustaw preferencje dietetyczne     | Jako użytkownik chcę wybrać jedną lub więcej preferencji z listy, aby otrzymywać dopasowane przepisy. | 1. Interfejs multi-select pokazuje 6 opcji. 2. Można zaznaczyć dowolną liczbę opcji. 3. Zaktualizowane preferencje są widoczne natychmiast.                                                                                                                                  |
| US-004 | Dodaj przepis                     | Jako użytkownik chcę dodać nowy przepis z tytułem i treścią, aby zapisać go w aplikacji.              | 1. Tytuł nie przekracza 50 znaków; treść nie przekracza 10 000 znaków. 2. Licznik znaków aktualizuje się w czasie rzeczywistym. 3. Widok pokazuje przyciski "zapisz" oraz "Dostosuj z AI", gdzie "zapisz" zapisuje przepis bezpośrednio i rejestruje recipe_saved timestamp. |
| US-005 | Dostosuj przepis z AI             | Jako użytkownik chcę zmodyfikować dodany przepis z pomocą AI, aby był zgodny z moimi preferencjami.   | 1. Kliknięcie "Dostosuj z AI" wysyła dane do modelu. 2. Odpowiedź AI pojawia się w <60 s lub komunikat o błędzie. 3. Wyświetla się zmodyfikowana wersja do akceptacji.                                                                                                       |
| US-006 | Akceptuj lub odrzuć propozycję AI | Jako użytkownik chcę zatwierdzić lub odrzucić wynik AI, aby kontrolować zapisywane przepisy.          | 1. Zatwierdzenie zapisuje przepis. 2. Odrzucenie porzuca wynik i nie zapisuje zmian. 3. Po zatwierdzeniu zdarzenie recipe_saved rejestruje timestamp.                                                                                                                        |
| US-007 | Przegląd listy przepisów          | Jako użytkownik chcę zobaczyć listę moich przepisów, aby mieć szybki dostęp do dań.                   | 1. Lista pokazuje tytuł i datę ostatniej edycji. 2. Kliknięcie elementu przechodzi do szczegółów.                                                                                                                                                                            |
| US-008 | Szczegóły przepisu                | Jako użytkownik chcę zobaczyć pełną treść wybranego przepisu, aby móc go przygotować.                 | 1. Widok pokazuje tytuł, treść oraz przyciski edytuj/usuń.                                                                                                                                                                                                                   |
| US-009 | Edytuj przepis                    | Jako użytkownik chcę edytować istniejący przepis, aby poprawić błędy lub ulepszyć danie.              | 1. Formularz wypełnia się aktualnymi danymi. 2. Po zapisaniu przepis nadpisuje poprzednią wersję. 3. Walidacja pól działa jak przy dodawaniu.                                                                                                                                |
| US-010 | Usuń przepis                      | Jako użytkownik chcę trwale usunąć przepis, aby uporządkować listę.                                   | 1. Akcja wymaga potwierdzenia. 2. Po potwierdzeniu przepis znika z listy. 3. Dane są nieodwracalnie usunięte z bazy.                                                                                                                                                         |
| US-011 | Usuń konto                        | Jako użytkownik chcę skasować konto wraz ze wszystkimi danymi, aby zakończyć korzystanie z usługi.    | 1. Akcja wymaga dodatkowego potwierdzenia. 2. Po operacji użytkownik zostaje przeniesiony na ekran logowania. 3.Po operacji logowanie starymi danymi nie jest możliwe.                                                                                                       |
| US-012 | Wylogowanie                       | Jako użytkownik chcę bezpiecznie się wylogować, aby zapobiec nieautoryzowanemu dostępowi.             | 1. Kliknięcie wyloguj kończy sesję i przekierowuje do ekranu logowania. 2. Odświeżenie strony nie przywraca sesji.                                                                                                                                                           |

## 6. Metryki sukcesu

1. Pokrycie preferencji: co najmniej 90 % aktywnych kont posiada ustawioną ≥ 1 preferencję (liczone na podstawie pól profilu).
2. Aktywność przepisów: 75 % aktywnych użytkowników zapisuje ≥ 1 przepis tygodniowo (unikalne recipe_saved / aktywni użytkownicy).
