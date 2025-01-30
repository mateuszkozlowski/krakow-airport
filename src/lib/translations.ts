type PeriodText = {
  en: {
    periodText: {
      one: string;
      other: string;
    }
  },
  pl: {
    periodText: {
      one: string;
      few: string;
      many: string;
    }
  }
};

export const translations = {
    en: {
        title: "Will I fly today from Krakow?",
        backToAirportInfo: "Back to Airport Info",
        weatherAdvisory: "Weather Advisory",
        importantFlightInfo: "Important Flight Information",
        flightDisruptions: "Significant flight disruptions are expected ",
        severeWeather: "Severe weather conditions are expected ",
        checkFlightStatus: "Check Flight Status",
        knowYourRights: "Know Your Rights",
        // Passenger Rights translations
        delayedFlight: "Delayed Flight? We're Here to Help",
        supportAvailable: "Find out what support is available and where to get immediate assistance at Kraków Airport",
        proTip: "Tip: If you encounter difficulties, remember that airport staff is working under challenging conditions and may be overwhelmed with a large number of passengers. Be patient, cooperate, and understand that doing everything you can to make their job easier will help resolve the situation more quickly.",
        whatToDoNow: "What to Do Right Now",
        stayAtGate: "Important: If you've already passed security, stay at your gate! Ask gate staff for assistance first.",
        atYourGate: "At Your Gate",
        beforeSecurity: "Before Security (Main Terminal)",
        documentEverything: "Document Everything",
        rightsBasedOnDelay: "Your Rights Based on Delay Duration",
        twoHourDelay: "2+ Hour Delay",
        fourHourDelay: "4+ Hour Delay",
        overnightDelay: "Overnight Delay",
        officialResources: "Official Resources",
        airportInfo: "Airport Info",
        // Gate section
        speakWithStaff: "Speak with gate staff",
        speakWithStaffDesc: "They can provide immediate updates and assistance with your flight.",
        requestConfirmation: "Request written confirmation",
        requestConfirmationDesc: "Ask for official documentation of any delay or cancellation.",
        askAboutRights: "Ask about EU261 rights",
        askAboutRightsDesc: "Staff must inform you about care and assistance you're entitled to.",
        // Before Security section
        visitAirlineDesk: "If you do not have information about your new flight, proceed immediately to security control and approach the staff at your gate for assistance.",  
        visitAirlineDeskDesc: "Go directly to security control and ask the staff at your gate for help – they are the ones who can assist with rebooking and provide support.",
        getInWriting: "Get everything in writing",
        getInWritingDesc: "Request written confirmation of any arrangements or promises made.",
        // Document Everything section
        takePhotos: "Take photos of displays",
        takePhotosDesc: "These screens show official flight status and delay times - important evidence for your claim.",
        keepDocuments: "Keep all documents",
        keepDocumentsDesc: "Save boarding passes, receipts, and any written communications from the airline.",
        noteStaffDetails: "Note staff details",
        noteStaffDetailsDesc: "Record names and badge numbers of staff you speak with about your situation.",
        // 2+ Hour Delay section
        freeMeals: "Free meals and refreshments",
        freeMealsDesc: "Airlines must provide food and drinks appropriate to the time of day and delay length.",
        phoneCalls: "Two phone calls or emails",
        phoneCallsDesc: "You can contact family or make alternative arrangements at the airline's expense.",
        wifi: "Access to airport Wi-Fi",
        wifiDesc: "Stay connected and updated about your flight status.",
        // 4+ Hour Delay section
        additionalMeals: "Additional meal vouchers",
        additionalMealsDesc: "For longer delays, airlines must provide additional meals appropriate to the waiting time.",
        reroutingOptions: "Rerouting options",
        reroutingOptionsDesc: "You can choose between alternative flights or a full refund if the delay is too long.",
        loungeAccess: "Access to the airline lounge",
        loungeAccessDesc: "Many airlines provide lounge access for comfortable waiting during long delays.",
        // Overnight Delay section
        hotelAccommodation: "Hotel accommodation",
        hotelAccommodationDesc: "Airlines must provide and arrange your hotel stay if you need to wait overnight.",
        transport: "Transport to/from the hotel",
        transportDesc: "Free transport between the airport and hotel must be provided or reimbursed.",
        multipleMeals: "Multiple meal vouchers",
        multipleMealsDesc: "You're entitled to meals for the entire duration of your extended delay.",
        cancelOption: "Option to cancel with a full refund",
        cancelOptionDesc: "If the delay is too long, you can choose to cancel your journey and get your money back.",
        // Resources section
        inEnglish: "In Your Language",
        inPolish: "In Polish Only",
        euGuide: "EU Air Passenger Rights Guide",
        faq: "FAQ",
        civilAviation: "Civil Aviation Authority",
        ministry: "Ministry of Infrastructure",
        // Airport Info section
        mainTerminal: "Main Terminal & Check-in",
        mainTerminalDesc: "Open during flight ops.",
        callCenter: "Call Center",
        ticketOffices: "Ticket Offices",
        ticketOfficesDesc: "(Main Terminal, near check-in):",
        lotOffice: "PLL LOT & Star Alliance",
        lotOfficeDesc: "Open during airline ops.",
        turkishOffice: "Turkish Airlines",
        turkishOfficeDesc: "Open 4 hrs before to 1 hr after departure.",
        otherAirlines: "Other Airlines",
        otherAirlinesDesc: "(Norwegian, Finnair, SWISS, Lufthansa, BA, easyJet, Ryanair, etc.)",
        otherAirlinesHours: "Open during ops.",
        needHelp: "Need help?",
        visitGateDesk: "Visit any gate desk during operational hours.",
        pageTitle: "Delayed Flight? We're Here to Help",
        pageSubtitle: "Find out what support is available and where to get immediate assistance at Kraków Airport",
        // Status messages
        statusSuspended: "Airport operations may be suspended. Check your flight status.",
        statusMajorDisruption: "Significant disruptions are likely. Check your flight status.",
        statusMinorDelays: "Minor delays are possible. Check flight status before leaving.",
        statusNormal: "Weather conditions are favorable for normal operations.",
        // Additional alert messages
        laterInDay: "Temporary severe weather conditions could also happen later in the day",
        checkStatus: "Please check your flight status",
        withAirline: "with your airline for any changes",
        directlyWithAirline: "directly with your airline for the latest updates",
        // Footer
        disclaimer: "This application is not an official Krakow Airport service. It is intended for informational purposes only and should not be used as the sole source for flight planning or decision-making. Always check with official sources and your airline for the most accurate and up-to-date information.",
        builtBy: "Built by Mateusz Kozłowski",
        changelog: "Changelog",
        email: "Email",
        website: "WWW",
        // WeatherTimeline translations
        currentConditions: "Current Conditions",
        updated: "Updated",
        today: "Today",
        tomorrow: "Tomorrow",
        until: "Until",
        temporaryConditions: "Temporary conditions possible:",
        noPhenomena: "No phenomena reported",
        probabilityChance: "% chance of these conditions",
        operationalImpacts: "Operational impacts",
        // Time formats
        nextDay: "Next day",
        // Weather phenomena descriptions (if not already covered in weather.ts)
        windConditions: "Wind",
        visibilityConditions: "Visibility",
        ceilingConditions: "Ceiling",
        gusts: "gusts",
        showMore: "Show more",
        showLess: "Show less",
        failedToLoad: "Failed to load data",
        tryAgain: "Try again",
        whatToExpect: "What to expect",
        showMorePeriods: "Show {count} more {periodText}",
        // Weather impact messages
        weatherImpactMessages: {
            operationsSuspended: "Operations suspended",
            visibilityBelowMinimums: "Visibility below minimums",
            diversionsLikely: "Diversions and cancellations likely",
            checkStatus: "Check your flight status",
            freezingConditions: "Operations severely restricted",
            extendedDelays: "Extended delays and possible cancellations",
            poorVisibility: "Operations restricted due to poor visibility",
            expectDelays: "Expect delays and possible diversions",
            normalOperations: "Normal operations with caution",
            understandWeatherImpact: "Understanding Weather Impact",
        },
        // Weather condition descriptions
        weatherDescriptions: {
            strongWinds: "Strong winds may cause turbulence and affect aircraft handling. Possible delays or operational changes.",
            rainAndWind: "Combined rain and strong winds. High risk of turbulence and reduced visibility. Expect operational impacts.",
            snowConditions: "Snow conditions may require de-icing and runway clearing. Expect delays.",
            deteriorating: "Weather conditions expected to deteriorate soon.",
            checkTimeline: "Check the timeline below for detailed changes",
        },
        // Operational impacts
        operationalImpactMessages: {
            deicingDelay: "❄️ Mandatory de-icing",
            likelyDeicing: "❄️ Likely de-icing required",
            possibleDeicing: "❄️ Possible de-icing",
            activeDeicing: "🧊 Active precipitation requiring de-icing procedures",
            runwayClearing: "🚜 Runway/taxiway snow clearing in progress",
            reducedCapacity: "👁️ Low Visibility Procedures active - reduced airport capacity",
            prolongedSnowOperations: "❄️ Prolonged snow - significant operational impact",
            extendedSnowOperations: "❄️ Extended snow - increased operational impact",
        },
        // Weather conditions and operational messages
        weatherConditionMessages: {
            clearSkies: "☀️ Clear skies and good visibility",
            reducedVisibility: "👁️ Poor visibility conditions",
            marginalConditions: "☁️ Marginal conditions",
            earlyMorning: "⏰ Possible reduced visibility during early morning hours",
            winterDeicing: "❄️ Likely de-icing required",
            visibilityBelowMinimums: "👁️ Visibility below minimums",
            
            // De-icing messages
            severeIcing: "❄️ Severe icing conditions",
            highIcingRisk: "❄️ High icing risk",
            possibleIcing: "❄️ Possible icing conditions",
            withPrecipitation: " with active precipitation",
            
            // Visibility messages
            visibilityBelowMinimumsMeters: "👁️ Visibility Below Minimums ({meters}m)",
            veryPoorVisibilityMeters: "👁️ Very Poor Visibility ({meters}m)",
            poorVisibility: "👁️ Poor Visibility",
            reducedVisibilitySimple: "👁️ Reduced Visibility",
            
            // Ceiling messages
            ceilingBelowMinimums: "☁️ Ceiling Below Minimums",
            veryLowCeiling: "☁️ Very Low Ceiling",
            
            // Wind messages
            veryStrongWindGusts: "💨 Very Strong Wind Gusts",
            strongWindGusts: "💨 Strong Wind Gusts",
            strongWinds: "💨 Strong Winds",
            moderateWinds: "💨 Moderate Winds",
            
            // Precipitation types
            lightDrizzle: "🌧️ Light Drizzle",
            moderateDrizzle: "🌧️ Moderate Drizzle",
            heavyDrizzle: "🌧️ Heavy Drizzle",
            lightRain: "🌧️ Light Rain",
            rain: "🌧️ Rain",
            heavyRain: "🌧️ Heavy Rain",
            lightSnow: "🌨️ Light Snow",
            snow: "🌨️ Snow",
            heavySnow: "🌨️ Heavy Snow",
            snowShowers: "🌨️ Snow Showers",
            mist: "🌫️ Mist",
            thunderstorm: "⛈️ Thunderstorm",
            thunderstormWithHail: "⛈️ Thunderstorm with Hail",
            severeThunderstorm: "⛈️ Severe Thunderstorm",
        },
        // Operational warnings and impacts
        operationalWarnings: {
            strongWindsApproaches: "⚠️ Strong winds affecting approaches",
            minorDelaysPossible: "⏳ Minor delays possible",
            dangerousGusts: "💨 Dangerous wind gusts - operations may be suspended",
            strongGustsOperations: "💨 Strong gusts affecting operations",
            windDelays: "💨 Strong winds may cause delays",
            visibilityDecreasing: "📉 Visibility decreasing",
            visibilityImproving: "📈 Visibility improving",
            operationsSuspended: "⛔ Below visibility minimums",
            diversionsLikely: "✈️ Diversions likely",
            reducedVisibilityMorning: "⏰ Possible reduced visibility during early morning hours",
            winterDeicing: "❄️ Likely de-icing required",
            poorVisibilityOps: "👁️ Poor visibility conditions",
            marginalConditions: "☁️ Marginal conditions",
            extendedDelays: "⏳ Extended delays likely",
            deicingRequired: "❄️ De-icing required",
            possibleDelays: "⚠️ Possible delays",
            someFlightsMayDivert: "✈️ Some flights may divert",
            winterWeatherWarning: "❄️ Winter weather conditions may cause delays",
        },
        // Risk level messages
        riskLevel4Title: "Major Weather Impact",
        riskLevel4Message: "Operations may be suspended",
            riskLevel4Status: "All flights may be suspended due to severe weather conditions. Check for updates with your airline. Unless you receive official cancellation information, you are obliged to arrive at the airport at least 2 hours before departure according to the schedule.",
        
        riskLevel3Title: "Weather Advisory",
        riskLevel3Message: "Operations may be restricted",
        riskLevel3Status: "Delays of more than 30 minutes are possible. Check your flight status with your airline. Remember that you are obliged to arrive at the airport at least 2 hours before departure according to the schedule.",
        
        riskLevel2Title: "Minor Weather Impact",
        riskLevel2Message: "Minor operational impacts expected",
        riskLevel2Status: "Flights are operating, but delays of 10 to 20 minutes are possible. Check your flight status with your airline. Remember that you are obliged to arrive at the airport at least 2 hours before departure according to the schedule.",
        
        riskLevel1Title: "Good Flying Conditions",
        riskLevel1Message: "Normal operations",
        riskLevel1Status: "All flights are operating on schedule.",
        
        // Time-based risk messages
        earlyMorningWarning: "Early morning conditions may affect visibility",
        winterWeatherWarning: "Winter weather conditions may cause delays",
        additionalConsideration: "Additional consideration: ",
        note: "Note: ",
        periodText: {
            one: "period",
            other: "periods"
        } as const,
        riskLegend: {
            title: "Weather Impact Guide",
            description: "This guide helps you understand how weather conditions might affect your flight and what actions to take.",
            whatToExpect: "What to expect:",
            whatToDo: "What you should do:",
            proTips: "Pro Tips",
            close: "Close",
            
            // Risk levels
            goodConditions: {
                title: "Good Flying Conditions",
                description: "Weather conditions are favorable for normal flight operations.",
                details: [
                    "Regular flight schedules maintained",
                    "Standard visibility and ceiling conditions",
                    "Normal approach and landing procedures",
                    "Routine ground operations"
                ],
                recommendations: [
                    "Check in at regular time",
                    "Follow standard airport procedures",
                    "No special preparations needed"
                ]
            },
            minorImpact: {
                title: "Minor Weather Impact",
                description: "Some weather-related disruptions possible, but generally manageable.",
                details: [
                    "Possible short delays (15-30 minutes)",
                    "Light precipitation or reduced visibility",
                    "De-icing procedures may be required",
                    "Slight adjustments to flight paths"
                ],
                recommendations: [
                    "Check flight status before leaving",
                    "Allow extra 15-30 minutes for travel",
                    "Keep your phone charged",
                    "Monitor airport/airline updates"
                ]
            },
            weatherAdvisory: {
                title: "Weather Advisory",
                description: "Significant weather conditions affecting flight operations.",
                details: [
                    "Moderate to long delays (30-90 minutes)",
                    "Possible flight cancellations",
                    "Extended de-icing procedures",
                    "Modified approach procedures",
                    "Reduced airport capacity"
                ],
                recommendations: [
                    "Check flight status frequently",
                    "Arrive 30-45 minutes earlier than usual",
                    "Have airline contact information ready",
                    "Consider flexible booking options",
                    "Monitor weather updates"
                ]
            },
            majorImpact: {
                title: "Major Weather Impact",
                description: "Severe weather conditions causing significant disruptions.",
                details: [
                    "Extended delays (2+ hours)",
                    "High probability of cancellations",
                    "Possible airport operational changes",
                    "Limited runway availability",
                    "Ground stop programs possible"
                ],
                recommendations: [
                    "Contact airline before traveling to airport",
                    "Check rebooking/refund policies",
                    "Consider alternative travel dates",
                    "Monitor airport operational status",
                    "Have backup travel plans ready"
                ]
            },
            tips: [
                "Download your airline's mobile app for instant updates",
                "Save airline contact numbers in your phone",
                "Take a screenshot of your booking details"
            ]
        },
        banner: {
            significantDisruptions: "Significant flight disruptions are expected",
            between: "between",
            and: "and",
            dueTo: "due to",
            thatMayOccur: "that may occur at times",
            temporaryConditions: "Temporary adverse weather conditions may occur later in the day",
            checkStatus: "Please check your flight status directly with your airline for the latest information"
        }
    },
    pl: {
        title: "Czy dziś polecę z Krakowa?",
        backToAirportInfo: "Powrót do informacji lotniskowych",
        weatherAdvisory: "Alert pogodowy",
        importantFlightInfo: "Ważna informacja na temat pogody",
        flightDisruptions: "Spodziewane są znaczące zakłócenia lotów ",
        severeWeather: "Spodziewane są trudne warunki pogodowe ",
        checkFlightStatus: "Sprawdź status lotu",
        knowYourRights: "Poznaj swoje prawa",
        // Passenger Rights translations
        delayedFlight: "Opóźniony lot? Jesteśmy tu, aby pomóc",
        supportAvailable: "Dowiedz się, jakie wsparcie jest dostępne i gdzie uzyskać natychmiastową pomoc na lotnisku w Krakowie",
        proTip: "Wskazówka: Jeśli napotkałeś trudności, pamiętaj, że personel lotniska działa w trudnych warunkach i może być obciążony dużą liczbą pasażerów. Bądź cierpliwy, współpracuj i zrozum, że zrobienie wszystkiego, co w Twojej mocy, aby ułatwić pracę personelu, pomoże w szybszym rozwiązaniu sytuacji.",
        whatToDoNow: "Co zrobić teraz",
        stayAtGate: "Ważne: Jeśli przeszedłeś już kontrolę bezpieczeństwa, pozostań przy bramce! Najpierw poproś o pomoc personel przy bramce.",
        atYourGate: "Przy bramce",
        beforeSecurity: "Przed kontrolą bezpieczeństwa (Terminal Główny)",
        documentEverything: "Dokumentuj wszystko",
        rightsBasedOnDelay: "Twoje prawa w zależności od długości opóźnienia",
        twoHourDelay: "Opóźnienie 2+ godziny",
        fourHourDelay: "Opóźnienie 4+ godziny",
        overnightDelay: "Opóźnienie z noclegiem",
        officialResources: "Oficjalne źródła",
        airportInfo: "Informacje lotniskowe",
        // Gate section
        speakWithStaff: "Porozmawiaj z personelem bramki",
        speakWithStaffDesc: "Mogą udzielić natychmiastowych informacji i pomocy dotyczącej Twojego lotu.",
        requestConfirmation: "Poproś o pisemne potwierdzenie",
        requestConfirmationDesc: "Poproś o oficjalną dokumentację opóźnienia lub odwołania.",
        askAboutRights: "Zapytaj o prawa EU261",
        askAboutRightsDesc: "Personel musi poinformować Cię o przysługującej Ci opiece i pomocy.",
        // Before Security section
        visitAirlineDesk: "Jeśli nie masz informacji o nowym locie, przejdź natychmiast do kontroli bezpieczeństwa i zwróć się do personelu przy swojej bramce.",  
        visitAirlineDeskDesc: "Udaj się bezpośrednio do kontroli bezpieczeństwa i zapytaj personel przy bramce o pomoc – to oni mogą pomóc w zmianie rezerwacji i udzielić wsparcia.",
        getInWriting: "Wszystko na piśmie",
        getInWritingDesc: "Poproś o pisemne potwierdzenie wszelkich ustaleń lub obietnic.",
        // Document Everything section
        takePhotos: "Zrób zdjęcia wyświetlaczy",
        takePhotosDesc: "Te ekrany pokazują oficjalny status lotu i czasy opóźnień - ważne dowody do reklamacji.",
        keepDocuments: "Zachowaj wszystkie dokumenty",
        keepDocumentsDesc: "Zachowaj karty pokładowe, paragony i wszelką pisemną komunikację od linii lotniczej.",
        noteStaffDetails: "Zapisz dane personelu",
        noteStaffDetailsDesc: "Zapisz imiona i numery identyfikacyjne personelu, z którym rozmawiasz o swojej sytuacji.",
        // 2+ Hour Delay section
        freeMeals: "Bezpłatne posiłki i napoje",
        freeMealsDesc: "Linie lotnicze muszą zapewnić jedzenie i napoje odpowiednie do pory dnia i długości opóźnienia.",
        phoneCalls: "Dwa telefony lub emaile",
        phoneCallsDesc: "Możesz skontaktować się z rodziną lub dokonać alternatywnych ustaleń na koszt linii lotniczej.",
        wifi: "Dostęp do Wi-Fi na lotnisku",
        wifiDesc: "Pozostań w kontakcie i na bieżąco ze statusem Twojego lotu.",
        // 4+ Hour Delay section
        additionalMeals: "Dodatkowe vouchery na posiłki",
        additionalMealsDesc: "Przy dłuższych opóźnieniach linie lotnicze muszą zapewnić dodatkowe posiłki odpowiednie do czasu oczekiwania.",
        reroutingOptions: "Opcje zmiany trasy",
        reroutingOptionsDesc: "Możesz wybrać między alternatywnymi lotami a pełnym zwrotem kosztów, jeśli opóźnienie jest zbyt długie.",
        loungeAccess: "Dostęp do saloniku linii lotniczej",
        loungeAccessDesc: "Wiele linii lotniczych zapewnia dostęp do saloniku dla komfortowego oczekiwania podczas długich opóźnień.",
        // Overnight Delay section
        hotelAccommodation: "Zakwaterowanie w hotelu",
        hotelAccommodationDesc: "Linie lotnicze muszą zapewnić i zorganizować pobyt w hotelu, jeśli musisz czekać przez noc.",
        transport: "Transport do/z hotelu",
        transportDesc: "Bezpłatny transport między lotniskiem a hotelem musi być zapewniony lub zwrócony.",
        multipleMeals: "Wielokrotne vouchery na posiłki",
        multipleMealsDesc: "Masz prawo do posiłków przez cały czas trwania przedłużonego opóźnienia.",
        cancelOption: "Możliwość anulowania z pełnym zwrotem",
        cancelOptionDesc: "Jeśli opóźnienie jest zbyt długie, możesz zdecydować się na anulowanie podróży i otrzymać zwrot pieniędzy.",
        // Resources section
        inEnglish: "W Twoim języku",
        inPolish: "Tylko po polsku",
        euGuide: "Przewodnik po prawach pasażerów UE",
        faq: "Często zadawane pytania",
        civilAviation: "Urząd Lotnictwa Cywilnego",
        ministry: "Ministerstwo Infrastruktury",
        // Airport Info section
        mainTerminal: "Terminal Główny i Odprawa",
        mainTerminalDesc: "Czynne w godzinach operacyjnych.",
        callCenter: "Centrum Obsługi",
        ticketOffices: "Kasy biletowe",
        ticketOfficesDesc: "(Terminal Główny, przy stanowiskach odprawy):",
        lotOffice: "PLL LOT i Star Alliance",
        lotOfficeDesc: "Czynne w godzinach operacyjnych linii.",
        turkishOffice: "Turkish Airlines",
        turkishOfficeDesc: "Czynne od 4 godz. przed do 1 godz. po odlocie.",
        otherAirlines: "Pozostałe linie lotnicze",
        otherAirlinesDesc: "(Norwegian, Finnair, SWISS, Lufthansa, BA, easyJet, Ryanair, itp.)",
        otherAirlinesHours: "Czynne w godzinach operacyjnych.",
        needHelp: "Potrzebujesz pomocy?",
        visitGateDesk: "Odwiedź dowolne stanowisko przy bramce w godzinach operacyjnych.",
        pageTitle: "Opóźniony lot? Jesteśmy tu, aby pomóc",
        pageSubtitle: "Dowiedz się, jakie wsparcie jest dostępne i gdzie uzyskać natychmiastową pomoc na lotnisku w Krakowie",
        // Status messages
        statusSuspended: "Operacje lotniska mogą zostać zawieszone. Sprawdź status swojego lotu.",
        statusMajorDisruption: "Prawdopodobne są znaczące zakłócenia. Sprawdź status swojego lotu.",
        statusMinorDelays: "Możliwe niewielkie opóźnienia. Sprawdź status lotu przed wyjściem.",
        statusNormal: "Warunki pogodowe sprzyjają normalnym operacjom.",
        // Additional alert messages
        laterInDay: "Przejściowe pogorszenie warunków pogodowych może również wystąpić później w ciągu dnia",
        checkStatus: "Zalecamy sprawdzenie statusu lotu",
        withAirline: "przed wyjściem na lotnisko",
        directlyWithAirline: "w celu uzyskania informacji o możliwych zmianach",
        // Footer
        disclaimer: "Ta aplikacja nie jest powiązana z Lotniskiem w Krakowie. Służy wyłącznie celom informacyjnym i nie powinna być używana jako jedyne źródło do planowania lotów lub podejmowania decyzji. Zawsze sprawdzaj oficjalne źródła i informacje od linii lotniczych, aby uzyskać najdokładniejsze i aktualne informacje.",
        builtBy: "Stworzone przez Mateusza Kozłowskiego",
        changelog: "Historia zmian",
        email: "Email",
        website: "WWW",
        // WeatherTimeline translations
        currentConditions: "Aktualne warunki",
        updated: "Aktualizacja",
        today: "Dziś",
        tomorrow: "Jutro",
        until: "Do",
        temporaryConditions: "Możliwe tymczasowe warunki:",
        noPhenomena: "Brak zjawisk do zgłoszenia",
        probabilityChance: "% szans na wystąpienie tych warunków",
        operationalImpacts: "Wpływ na operacje",
        // Time formats
        nextDay: "Jutro",
        // Weather phenomena descriptions
        windConditions: "Wiatr",
        visibilityConditions: "Widoczność",
        ceilingConditions: "Podstawa chmur",
        gusts: "porywy",
        showMore: "Pokaż więcej",
        showLess: "Pokaż mniej",
        failedToLoad: "Nie udało się załadować danych",
        tryAgain: "Spróbuj ponownie",
        whatToExpect: "Czego się spodziewać",
        showMorePeriods: "Pokaż {count} więcej {periodText}",
        // Weather impact messages
        weatherImpactMessages: {
            operationsSuspended: "Operacje zawieszone",
            visibilityBelowMinimums: "Widoczność poniżej minimów",
            diversionsLikely: "Prawdopodobne przekierowania i odwołania lotów",
            checkStatus: "Sprawdź status swojego lotu",
            freezingConditions: "Operacje znacznie ograniczone",
            extendedDelays: "Wydłużone opóźnienia i możliwe odwołania",
            poorVisibility: "Operacje ograniczone ze względu na słabą widoczność",
            expectDelays: "Spodziewaj się opóźnień i możliwych przekierowań",
            normalOperations: "Normalne operacje z zachowaniem ostrożności",
            understandWeatherImpact: "Co oznaczają poszczególne poziomy alertów pogodowych",
        },
        // Weather condition descriptions
        weatherDescriptions: {
            strongWinds: "Silny wiatr może powodować turbulencje i wpływać na operacje lotnicze. Możliwe opóźnienia lub zmiany operacyjne.",
            rainAndWind: "Połączenie deszczu i silnego wiatru. Wysokie ryzyko turbulencji i ograniczona widoczność. Spodziewaj się wpływu na operacje.",
            snowConditions: "Warunki śniegowe mogą wymagać odladzania i odśnieżania pasa. Spodziewaj się opóźnień.",
            deteriorating: "Warunki pogodowe mają ulec pogorszeniu.",
            checkTimeline: "Sprawdź oś czasu poniżej, aby zobaczyć szczegółowe zmiany",
        },
        // Operational impacts
        operationalImpactMessages: {
            deicingDelay: "❄️ Wymagane odladzanie",
            likelyDeicing: "❄️ Prawdopodobne odladzanie",
            possibleDeicing: "❄️ Możliwe odladzanie",
            activeDeicing: "🧊 Aktywne opady wymagające procedur odladzania",
            runwayClearing: "🚜 Odśnieżanie pasa startowego/dróg kołowania",
            reducedCapacity: "👁️ Aktywne procedury niskiej widoczności - zmniejszona przepustowość",
            prolongedSnowOperations: "❄️ Długotrwałe opady śniegu - znaczący wpływ na operacje",
            extendedSnowOperations: "❄️ Przedłużające się opady śniegu - zwiększony wpływ na operacje",
        },
        // Weather conditions and operational messages
        weatherConditionMessages: {
            clearSkies: "☀️ Czyste niebo i dobra widoczność",
            reducedVisibility: "👁️ Słaba widoczność",
            marginalConditions: "☁️ Graniczne warunki",
            earlyMorning: "⏰ Możliwa ograniczona widoczność we wczesnych godzinach porannych",
            winterDeicing: "❄️ Prawdopodobne odladzanie",
            visibilityBelowMinimums: "👁️ Widoczność poniżej minimów",
            
            // De-icing messages
            severeIcing: "❄️ Poważne warunki oblodzeniowe",
            highIcingRisk: "❄️ Wysokie ryzyko oblodzenia",
            possibleIcing: "❄️ Możliwe oblodzenie",
            withPrecipitation: " z aktywnymi opadami",
            
            // Visibility messages
            visibilityBelowMinimumsMeters: "👁️ Widoczność poniżej minimów ({meters}m)",
            veryPoorVisibilityMeters: "👁️ Bardzo słaba widoczność ({meters}m)",
            poorVisibility: "👁️ Słaba widoczność",
            reducedVisibilitySimple: "👁️ Ograniczona widoczność",
            
            // Ceiling messages
            ceilingBelowMinimums: "☁️ Podstawa chmur poniżej minimów",
            veryLowCeiling: "☁️ Bardzo niska podstawa chmur",
            
            // Wind messages
            veryStrongWindGusts: "💨 Bardzo silne porywy wiatru",
            strongWindGusts: "💨 Silne porywy wiatru",
            strongWinds: "💨 Silny wiatr",
            moderateWinds: "💨 Umiarkowany wiatr",
            
            // Precipitation types
            lightDrizzle: "🌧️ Lekka mżawka",
            moderateDrizzle: "🌧️ Umiarkowana mżawka",
            heavyDrizzle: "🌧️ Silna mżawka",
            lightRain: "🌧️ Lekki deszcz",
            rain: "🌧️ Deszcz",
            heavyRain: "🌧️ Silny deszcz",
            lightSnow: "🌨️ Lekki śnieg",
            snow: "🌨️ Śnieg",
            heavySnow: "🌨️ Intensywny śnieg",
            snowShowers: "🌨️ Przelotny śnieg",
            mist: "🌫️ Zamglenie",
            thunderstorm: "⛈️ Burza",
            thunderstormWithHail: "⛈️ Burza z gradem",
            severeThunderstorm: "⛈️ Silna burza",
        },
        // Operational warnings and impacts
        operationalWarnings: {
            strongWindsApproaches: "⚠️ Silny wiatr wpływa na podejścia",
            minorDelaysPossible: "⏳ Możliwe niewielkie opóźnienia",
            dangerousGusts: "💨 Niebezpieczne porywy wiatru - operacje mogą zostać zawieszone",
            strongGustsOperations: "💨 Silne porywy wpływają na operacje",
            windDelays: "💨 Silny wiatr może powodować opóźnienia",
            visibilityDecreasing: "📉 Widoczność się pogarsza",
            visibilityImproving: "📈 Widoczność się poprawia",
            operationsSuspended: "⛔ Widoczność poniżej minimów",
            diversionsLikely: "✈️ Prawdopodobne przekierowania",
            reducedVisibilityMorning: "⏰ Możliwa ograniczona widoczność we wczesnych godzinach porannych",
            winterDeicing: "❄️ Prawdopodobne odladzanie",
            poorVisibilityOps: "👁️ Słaba widoczność",
            marginalConditions: "☁️ Graniczne warunki",
            extendedDelays: "⏳ Prawdopodobne dłuższe opóźnienia",
            deicingRequired: "❄️ Wymagane odladzanie",
            possibleDelays: "⚠️ Możliwe opóźnienia",
            someFlightsMayDivert: "✈️ Niektóre loty mogą zostać przekierowane",
            winterWeatherWarning: "❄️ Warunki zimowe mogą powodować opóźnienia",
        },
        // Risk level messages
        riskLevel4Title: "Poważne zakłócenia",
        riskLevel4Message: "Operacje prawdopodobnie zawieszone",
        riskLevel4Status: "Wszystkie loty mogą być zawieszone ze względu na trudne warunki pogodowe. Sprawdź aktualizacje u swojego przewoźnika. \n\nJeśli nie otrzymałeś oficjalnej informacji o anulacji lotu wraz z nową rezerwacją, Twoim obowiązkiem jest przybycie na lotnisko co najmniej 2 godziny przed planowanym (zgodnie z rozkładem) wylotem.",
        
        riskLevel3Title: "Alert pogodowy",
        riskLevel3Message: "Operacje mogą być ograniczone",
        riskLevel3Status: `Możliwe opóźnienia powyżej 30 minut. Sprawdź status swojego lotu u przewoźnika. Pamiętaj, że Twoim obowiązkiem jest przybycie na lotnisko co najmniej 2 godziny przed planowanym (zgodnie z rozkładem) wylotem.`,
        
        riskLevel2Title: "Niewielki wpływ pogody",
        riskLevel2Message: "Spodziewane niewielkie utrudnienia",
        riskLevel2Status: `Loty odbywają się, ale możliwe są opóźnienia od 10 do 20 minut. Sprawdź status swojego lotu u przewoźnika.
        \n\nPamiętaj, że Twoim obowiązkiem jest przybycie na lotnisko co najmniej 2 godziny przed planowanym (zgodnie z rozkładem) wylotem.`,
        
        riskLevel1Title: "Dobre warunki do lotów",
        riskLevel1Message: "Normalne operacje",
        riskLevel1Status: "Wszystkie loty odbywają się zgodnie z rozkładem.",
        
        // Time-based risk messages
        earlyMorningWarning: "Warunki wczesnoporanne mogą wpływać na widoczność",
        winterWeatherWarning: "Warunki zimowe mogą powodować opóźnienia",
        additionalConsideration: "Dodatkowe uwagi: ",
        note: "Uwaga: ",
        periodText: {
            one: "okres",
            few: "okresy",
            many: "okresów"
        } as const,
        riskLegend: {
            title: "Przewodnik po wpływie pogody",
            description: "Ten przewodnik pomoże Ci zrozumieć, jak warunki pogodowe mogą wpłynąć na Twój lot i jakie działania należy podjąć.",
            whatToExpect: "Czego się spodziewać:",
            whatToDo: "Co należy zrobić:",
            proTips: "Przydatne wskazówki",
            close: "Zamknij",
            
            // Risk levels
            goodConditions: {
                title: "Dobre warunki do lotów",
                description: "Warunki pogodowe sprzyjają normalnym operacjom lotniczym.",
                details: [
                    "Regularne rozkłady lotów",
                    "Standardowa widoczność i podstawa chmur",
                    "Normalne procedury podejścia i lądowania",
                    "Rutynowe operacje naziemne"
                ],
                recommendations: [
                    "Standardowa odprawa",
                    "Standardowe procedury lotniskowe",
                    "Nie są wymagane dodatkowe przygotowania"
                ]
            },
            minorImpact: {
                title: "Niewielki wpływ pogody",
                description: "Możliwe niewielkie zakłócenia związane z pogodą, ale sytuacja pod kontrolą.",
                details: [
                    "Możliwe krótkie opóźnienia (15-30 minut)",
                    "Lekkie opady lub ograniczona widoczność",
                    "Może być wymagane odladzanie",
                    "Niewielkie korekty ścieżek lotu"
                ],
                recommendations: [
                    "Sprawdź status lotu przed wyjazdem",
                    "Zaplanuj dodatkowe 15-30 minut na podróż",
                    "Naładuj telefon",
                    "Śledź aktualizacje lotniska/linii lotniczej"
                ]
            },
            weatherAdvisory: {
                title: "Alert pogodowy",
                description: "Znaczące warunki pogodowe wpływające na operacje lotnicze.",
                details: [
                    "Umiarkowane do długich opóźnienia (30-90 minut)",
                    "Możliwe odwołania lotów",
                    "Wydłużone procedury odladzania",
                    "Zmodyfikowane procedury podejścia",
                    "Zmniejszona przepustowość lotniska"
                ],
                recommendations: [
                    "Często sprawdzaj status lotu",
                    "Przybądź 30-45 minut wcześniej niż zwykle",
                    "Przygotuj dane kontaktowe linii lotniczej",
                    "Rozważ elastyczne opcje rezerwacji",
                    "Monitoruj aktualizacje pogody"
                ]
            },
            majorImpact: {
                title: "Poważne zakłócenia",
                description: "Trudne warunki pogodowe powodujące znaczące zakłócenia.",
                details: [
                    "Długie opóźnienia (2+ godziny)",
                    "Wysokie prawdopodobieństwo odwołań",
                    "Możliwe zmiany w operacjach lotniska",
                    "Ograniczona dostępność pasa startowego",
                    "Możliwe wstrzymanie operacji naziemnych"
                ],
                recommendations: [
                    "Skontaktuj się z linią lotniczą przed przyjazdem na lotnisko",
                    "Sprawdź zasady zmiany rezerwacji/zwrotów",
                    "Rozważ alternatywne daty podróży",
                    "Monitoruj status operacyjny lotniska",
                    "Przygotuj plan awaryjny"
                ]
            },
            tips: [
                "Pobierz aplikację mobilną swojej linii lotniczej, aby otrzymywać natychmiastowe aktualizacje",
                "Zapisz numery kontaktowe linii lotniczej w telefonie",
                "Zrób zrzut ekranu szczegółów rezerwacji"
            ]
        },
        banner: {
            significantDisruptions: "Spodziewane są znaczące zakłócenia lotów",
            between: "w godzinach",
            and: "do",
            dueTo: "z powodu",
            thatMayOccur: "które mogą występować okresowo",
            temporaryConditions: "Przejściowe pogorszenie warunków pogodowych może również wystąpić później w ciągu dnia",
            checkStatus: "Zalecamy sprawdzenie statusu lotu w celu uzyskania informacji o możliwych zmianach"
        }
    }
} as const; 