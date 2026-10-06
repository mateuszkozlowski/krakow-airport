import type { Locale } from "../weather/model";
import type { TransportPageKind } from "./paths";
export const pageCopy: Record<
  Locale,
  Record<
    TransportPageKind,
    {
      title: string;
      seoTitle: string;
      description: string;
      faq: { q: string; a: string }[];
    }
  >
> = {
  pl: {
    transport: {
      title: "Dojazd · Kraków Balice",
      seoTitle: "Dojazd z Balic i na lotnisko: pociągi, autobusy i przesiadki",
      description:
        "Połączenia dla daty i godziny Twojego przylotu lub odlotu w Krakowie. Pociągi KMŁ, autobusy 209, 300 i 902 oraz FlixBus, z czasem na bagaż i przesiadki.",
      faq: [
        {
          q: "Gdzie wsiąść na lotnisku?",
          a: "Stacja Kraków Lotnisko jest połączona z terminalem kładką. Autobusy miejskie odjeżdżają sprzed terminala. Dla FlixBusa sprawdź stanowisko na bilecie. Przy wybranym połączeniu znajdziesz lokalizację przystanku na mapie.",
        },
        {
          q: "Czy jeden bilet obejmuje całą podróż?",
          a: "Bilet kolejowy, miejski i FlixBusa to zwykle osobne bilety. Przy przesiadce między przewoźnikami sprawdź warunki obu biletów. W przypadku KMŁ bilet można kupić przez oficjalne kanały przewoźnika; bilet miejski powinien obejmować strefę lotniska i zostać skasowany zgodnie z zasadami ZTP.",
        },
        {
          q: "Czy to są aktualne opóźnienia?",
          a: "Podstawą jest rozkład na wybrany dzień. Opóźnienie pokazujemy wyłącznie przy kursie dopasowanym do świeżych danych ZTP lub PLK. Brak takiej informacji oznacza godzinę z rozkładu. FlixBus nie udostępnia tu dostępności miejsc ani rzeczywistej godziny odjazdu.",
        },
      ],
    },
    night: {
      title: "Przylot w nocy",
      seoTitle: "Dojazd z Balic w nocy: ostatni pociąg i autobus 902",
      description:
        "Sprawdź dojazd z lotniska Kraków po późnym przylocie. Rozkład dla konkretnej nocy, czas na bagaż, autobus 902 i następne połączenia.",
      faq: [
        {
          q: "Ląduję o 23:45. Czy będzie jeszcze pociąg?",
          a: "To zależy od daty i czasu potrzebnego na wyjście z terminala. Wpisz planowany przylot oraz zapas na bagaż i kontrolę graniczną. Planer sprawdza pociągi i autobus 902 po północy, a przy każdej godzinie pokazuje dzień odjazdu.",
        },
        {
          q: "Co, jeśli samolot się spóźni?",
          a: "Wybierz +30, +60 lub +90 minut przy pytaniu o późniejsze lądowanie. Lista połączeń przeliczy się dla nowej godziny wyjścia z terminala. To scenariusz, a nie informacja o faktycznym opóźnieniu Twojego lotu.",
        },
        {
          q: "Czy autobus 902 dowozi do Rynku?",
          a: "902 obsługuje Dworzec Główny Wschód. Stamtąd do Rynku trzeba jeszcze dojść lub przesiąść się. Wynik kończy się na wskazanym przystanku, nie pod adresem hotelu.",
        },
      ],
    },
    early: {
      title: "Odlot wcześnie rano",
      seoTitle: "Lot z Balic o 6 rano: jak dojechać na lotnisko",
      description:
        "Znajdź nocny autobus lub pociąg na poranny lot z Krakowa. Wpisz godzinę odlotu i wybierz, ile wcześniej chcesz być w terminalu.",
      faq: [
        {
          q: "Mam odlot o 6:00. O której wyjechać?",
          a: "Domyślnie szukamy dojazdu na lotnisko najpóźniej o 4:00, czyli dwie godziny przed odlotem. Możesz zwiększyć lub zmniejszyć ten czas zgodnie z zaleceniem linii lotniczej. Wynik pokazuje odjazd z wybranego dworca, nie godzinę wyjścia z domu.",
        },
        {
          q: "Czy mogę wyjechać później, gdy lot jest opóźniony?",
          a: "Samo opóźnienie odlotu nie przesuwa automatycznie odprawy ani zamknięcia bramki. Plan dojazdu nadal odnosimy do godziny na bilecie, dopóki przewoźnik nie poda innych instrukcji.",
        },
        {
          q: "Czy autobus 902 będzie odpowiedni?",
          a: "Planer porównuje kursy 902 i pociągi dla wybranego dnia. Przy wyniku zobaczysz godzinę dotarcia oraz dodatkowy czas przed wskazaną godziną przyjazdu na lotnisko. Rozkład może zmieniać się w weekendy i święta.",
        },
      ],
    },
    zakopane: {
      title: "Z Balic do Zakopanego",
      seoTitle: "Kraków Airport – Zakopane: autobus i przesiadka na pociąg",
      description:
        "Dojazd z lotniska w Balicach do Zakopanego dla godziny przylotu. Bezpośredni FlixBus lub przesiadka w Krakowie z zapasem czasu na przejście.",
      faq: [
        {
          q: "Czy jest bezpośredni autobus z lotniska?",
          a: "W rozkładzie FlixBusa są połączenia z Kraków Airport do Zakopanego. Ich dostępność zależy od dnia. Planer sprawdza także dojazd do Krakowa Głównego i dalszy pociąg KMŁ lub autobus. Miejsca i cenę trzeba sprawdzić u przewoźnika.",
        },
        {
          q: "Gdzie odbywa się przesiadka?",
          a: "Przesiadki planujemy przy Krakowie Głównym. Dworzec autobusowy MDA i przystanek Dworzec Główny Wschód są po wschodniej stronie stacji. Domyślnie zostawiamy minimum 20 minut na przejście i znalezienie stanowiska; z dużym bagażem możesz zwiększyć ten czas.",
        },
        {
          q: "Dlaczego nie widzę wszystkich przewoźników?",
          a: "Uwzględniamy opublikowane rozkłady KMŁ, ZTP i FlixBusa. Prywatne busy oraz pociągi innych przewoźników mogą mieć dodatkowe kursy. Brak wyniku nie oznacza, że w danym dniu nie da się dojechać do Zakopanego.",
        },
      ],
    },
  },
  en: {
    transport: {
      title: "Kraków Airport transport",
      seoTitle:
        "Kraków Airport transport: trains, buses and onward connections",
      description:
        "Connections for your arrival or departure time in Kraków. KMŁ trains, city buses 209, 300 and 902, and FlixBus, allowing time for luggage and transfers.",
      faq: [
        {
          q: "Where do I board at the airport?",
          a: "Kraków Lotnisko railway station is connected to the terminal by a footbridge. City buses leave from outside the terminal. Check your FlixBus ticket for its boarding point. Each selected connection includes a map link for the stop.",
        },
        {
          q: "Does one ticket cover the whole journey?",
          a: "Railway, city bus and FlixBus tickets are usually separate. Check both operators' conditions when changing services. Buy KMŁ tickets through its official sales channels. City tickets must cover the airport fare zone and be validated according to ZTP rules.",
        },
        {
          q: "Are these real-time departure times?",
          a: "The timetable for your selected date is the starting point. We show a delay only when fresh ZTP or PLK data matches that specific service. Otherwise the time is scheduled. FlixBus seat availability and real-time departures are not included.",
        },
      ],
    },
    night: {
      title: "Arriving late at night",
      seoTitle: "Kraków Airport at night: last train and bus 902",
      description:
        "Check transport from Kraków Airport after a late flight. Timetables for your exact night, time for luggage, bus 902 and later connections.",
      faq: [
        {
          q: "I land at 23:45. Can I still catch a train?",
          a: "That depends on the date and how long it takes to leave the terminal. Enter the scheduled landing time and allow for luggage and passport control. The planner checks trains and bus 902 after midnight, showing the departure date beside every time.",
        },
        {
          q: "What if my flight lands late?",
          a: "Select +30, +60 or +90 minutes under the later-landing question. Connections are recalculated for your new terminal exit time. This is a scenario, not a live report of your flight's delay.",
        },
        {
          q: "Does bus 902 go to the main square?",
          a: "902 serves Dworzec Główny Wschód, on the east side of the main station. You still need to walk or change transport to reach the main square. The result ends at the named stop, not at your hotel.",
        },
      ],
    },
    early: {
      title: "Flying early in the morning",
      seoTitle: "A 6 am flight from Kraków: how to get to the airport",
      description:
        "Find a night bus or train for an early flight from Kraków. Enter your departure time and choose how early you want to reach the airport.",
      faq: [
        {
          q: "My flight leaves at 06:00. When should I travel?",
          a: "By default, we find transport arriving by 04:00, two hours before departure. Adjust this according to your airline's instructions. The result starts at your selected station, not at your home or hotel.",
        },
        {
          q: "Can I leave later if my flight is delayed?",
          a: "A delayed departure does not automatically change check-in or gate closing times. We continue to use the time on your ticket unless your airline gives different instructions.",
        },
        {
          q: "Can I use night bus 902?",
          a: "The planner compares bus 902 and trains for your travel date. Each result shows the arrival time and any extra time before your target airport arrival. Timetables may differ at weekends and on public holidays.",
        },
      ],
    },
    zakopane: {
      title: "Kraków Airport to Zakopane",
      seoTitle: "Kraków Airport to Zakopane: direct bus and train connections",
      description:
        "Transport from Kraków Airport to Zakopane for your landing time. Direct FlixBus or a change in Kraków, with time to walk between stations.",
      faq: [
        {
          q: "Is there a direct bus from the airport?",
          a: "FlixBus publishes services from Kraków Airport to Zakopane, depending on the date. We also check transport to Kraków Główny followed by a KMŁ train or bus. Check seats and ticket prices directly with the operator.",
        },
        {
          q: "Where do I change?",
          a: "Connections change around Kraków Główny. MDA bus station and Dworzec Główny Wschód are on the east side of the railway station. We allow at least 20 minutes to walk and find the boarding point. Increase this if you have heavy luggage.",
        },
        {
          q: "Why are some operators missing?",
          a: "We use published KMŁ, ZTP and FlixBus timetables. Private minibuses and other train operators may offer more departures. No result does not mean that reaching Zakopane that day is impossible.",
        },
      ],
    },
  },
};
