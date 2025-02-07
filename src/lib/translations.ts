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
        delayedFlight: "Flight Delay: Your Rights & Support",
        supportAvailable: "We'll help you understand what support is available and what steps to take",
        proTip: "Helpful tip: While delays can be frustrating, staying calm and polite with airline staff will help you get the assistance you need faster. The staff is there to help you!",
        compensationInfo: "Would you like help understanding your rights? ",
        airHelpLink: "AirHelp can help you claim compensation",
        sponsoredDisclosure: " (Sponsored link - we may receive a commission)",
        whatToDoNow: "Steps to Take During a Delay",
        stayInformed: "Important: Stay near your gate or check the flight information displays regularly. Keep your airline's app installed for instant updates.",
        atYourGate: "At Your Gate",
        beforeSecurity: "Before Security",
        documentEverything: "Step 1: Keep Track of Everything",
        rightsBasedOnDelay: "Your EU261 Rights Based on Delay Duration",
        twoHourDelay: "2+ Hour Delay",
        fourHourDelay: "4+ Hour Delay",
        overnightDelay: "Overnight Delay",
        officialResources: "Official Resources",
        // Gate section
        speakWithStaff: "Speak with airline staff",
        speakWithStaffDesc: "They can provide immediate updates and assistance with your flight.",
        requestConfirmation: "Request written confirmation",
        requestConfirmationDesc: "Ask for official documentation of any delay or cancellation.",
        askAboutRights: "Ask about EU261 rights",
        askAboutRightsDesc: "Airlines must inform you about care and compensation rights under EU261 regulation.",
        // Before Security section
        visitAirlineDesk: "Visit airline information desk",
        visitAirlineDeskDesc: "The airline's staff can provide official information about your flight and available options.",
        getInWriting: "Get everything in writing",
        getInWritingDesc: "Request written confirmation of any arrangements, promises, or flight status changes.",
        // Document Everything section
        takePhotos: "Take photos of displays",
        takePhotosDesc: "Take clear photos of flight information displays showing the delay - this will be helpful if you need them later",
        keepDocuments: "Keep all documents",
        keepDocumentsDesc: "Save your boarding pass and any messages from the airline about the delay",
        // 2+ Hour Delay section
        freeMeals: "Free meals and refreshments",
        freeMealsDesc: "For delays of 2+ hours, airlines must provide food and drinks appropriate to the waiting time.",
        phoneCalls: "Two phone calls or emails",
        phoneCallsDesc: "You're entitled to make calls or send emails at the airline's expense.",
        wifi: "Communication means",
        wifiDesc: "Airlines should ensure you can communicate about your situation.",
        // 4+ Hour Delay section
        additionalMeals: "Additional care",
        additionalMealsDesc: "For longer delays, airlines must continue providing appropriate care.",
        reroutingOptions: "Rerouting options",
        reroutingOptionsDesc: "You can choose between alternative flights or a full refund if the delay is too long.",
        loungeAccess: "Access to the airline lounge",
        loungeAccessDesc: "Many airlines provide lounge access for comfortable waiting during long delays.",
        // Overnight Delay section
        hotelAccommodation: "Hotel accommodation",
        hotelAccommodationDesc: "For overnight delays, airlines must provide and arrange your hotel stay.",
        transport: "Transport to/from hotel",
        transportDesc: "Free transport between the airport and hotel must be provided.",
        multipleMeals: "Continued care",
        multipleMealsDesc: "You're entitled to meals and refreshments for the entire delay duration.",
        cancelOption: "Right to reimbursement",
        cancelOptionDesc: "For long delays, you can choose to cancel your journey and get a full refund.",
        // Weather compensation section
        weatherCompensation: "What About Weather Delays?",
        weatherCompensationDesc: "During weather delays, you'll still receive care (meals, hotel if needed), but compensation might not apply if the delay was caused by severe weather conditions.",
        weatherCompensationNote: "However, if the delay was caused by the airline's failure to prepare for forecasted weather, you might be eligible for compensation.",
        weatherCompensationTip: "Always document the exact reason given for the delay and weather conditions.",
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
        pageSubtitle: "Find out what support is available",
        // Status messages
        statusSuspended: "Airport operations may be suspended. Check your flight status.",
        statusMajorDisruption: "Significant disruptions are likely. Check your flight status.",
        statusMinorDelays: "Minor delays are possible. Check your flight status regularly.",
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
            operationsSuspended: "⛔ Low visibility",
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
        },
        // Compensation section
        compensationRights: "Step 3: Understanding Your Rights",
        compensationTitle: "What You Should Know About EU261",
        compensationDesc: "For delays over 3 hours, EU law provides for compensation up to €600, depending on your flight distance and the cause of delay.",
        // Next steps section
        nextSteps: "Quick Action Guide",
        nextStepsDesc: "Follow these steps to protect your rights and get assistance:",
        nextStep1: "Document everything - take photos of information displays and keep all communications",
        nextStep2: "Ask airline staff about your EU261 rights and get written confirmation of the delay",
        nextStep3: "Keep receipts for any expenses related to the delay (meals, transport, etc.)",
        nextStepsTip: "Pro tip: Use your phone to take photos of all important documents and communications",
        // Care rights section
        careRights: "Step 2: Getting Help & Support",
        getAssistance: "Available Assistance",
        getAssistanceDesc: "The airline will provide you with meals, drinks, and help with communication. For longer delays, they'll also arrange a hotel if needed.",
        // Flight distance categories
        shortHaulDelay: "For flights up to 1500 km: after 2 hours",
        mediumHaulDelay: "For flights 1500-3500 km: after 3 hours",
        longHaulDelay: "For flights over 3500 km: after 4 hours",
        // Additional meals and care
        additionalMealsNote: "Airlines must provide additional meals and refreshments appropriate to the waiting time",
        reroutingOptionsNote: "You can choose between alternative flights or a full refund if the delay is too long",
        // Hotel accommodation
        hotelTransportNote: "Free transport between the airport and hotel must be provided",
        hotelQualityNote: "The hotel must be of reasonable standard, typically 3-star or equivalent",
        // Communication rights
        communicationNote: "This includes phone calls, emails, or fax messages - two communications per passenger",
        // General care rights notes
        careRightsNote: "These rights apply regardless of the reason for the delay, even in extraordinary circumstances",
        careRightsImportant: "Keep all receipts for expenses - you may claim these back from the airline",
        // Timeline labels
        rightNow: "Right now",
        within30Mins: "Within 30 minutes",
        after2Hours: "After 2 hours",
        after3Hours: "After 3 hours",
    },
    pl: {
        title: "Czy dziś polecę z Krakowa?",
        backToAirportInfo: "Powrót do informacji lotniskowych",
        weatherAdvisory: "Alert pogodowy",
        importantFlightInfo: "Informacja o warunkach pogodowych",
        flightDisruptions: "Możliwe są znaczące zakłócenia lotów ",
        severeWeather: "Prognozowane są trudne warunki pogodowe ",
        checkFlightStatus: "Sprawdź status lotu",
        knowYourRights: "Informacje o prawach pasażera",
        // Passenger Rights translations
        delayedFlight: "Opóźnienie Lotu: Twoje Prawa i Wsparcie",
        supportAvailable: "Pomożemy Ci zrozumieć, jakie wsparcie jest dostępne i co możesz zrobić",
        proTip: "Pomocna rada: Chociaż opóźnienia mogą być frustrujące, zachowanie spokoju i uprzejmości wobec personelu linii lotniczych pomoże Ci szybciej uzyskać potrzebną pomoc. Personel jest po to, żeby Ci pomóc!",
        compensationInfo: "Chcesz pomocy w zrozumieniu swoich praw? ",
        airHelpLink: "AirHelp może pomóc Ci w uzyskaniu odszkodowania",
        sponsoredDisclosure: " (Link sponsorowany - możemy otrzymać prowizję)",
        whatToDoNow: "Co zrobić podczas opóźnienia",
        stayInformed: "Ważne: Pozostań w pobliżu bramki lub regularnie sprawdzaj tablice informacyjne. Warto mieć zainstalowaną aplikację przewoźnika, aby otrzymywać aktualne informacje.",
        atYourGate: "Przy bramce",
        beforeSecurity: "Przed kontrolą bezpieczeństwa",
        documentEverything: "Krok 1: Zbieraj informacje",
        rightsBasedOnDelay: "Twoje prawa według EU261 w zależności od długości opóźnienia",
        twoHourDelay: "Opóźnienie 2+ godziny",
        fourHourDelay: "Opóźnienie 4+ godziny",
        overnightDelay: "Opóźnienie z noclegiem",
        officialResources: "Oficjalne źródła",
        // Gate section
        speakWithStaff: "Porozmawiaj z personelem linii",
        speakWithStaffDesc: "Mogą udzielić natychmiastowych informacji i pomocy dotyczącej Twojego lotu.",
        requestConfirmation: "Poproś o pisemne potwierdzenie",
        requestConfirmationDesc: "Poproś o oficjalną dokumentację opóźnienia lub odwołania.",
        askAboutRights: "Zapytaj o prawa EU261",
        askAboutRightsDesc: "Linie muszą poinformować Cię o prawach do opieki i odszkodowania według rozporządzenia EU261.",
        // Before Security section
        visitAirlineDesk: "Odwiedź punkt informacyjny linii",
        visitAirlineDeskDesc: "Personel linii lotniczej może udzielić oficjalnych informacji o Twoim locie i dostępnych opcjach.",
        getInWriting: "Wszystko na piśmie",
        getInWritingDesc: "Poproś o pisemne potwierdzenie wszelkich ustaleń, obietnic lub zmian statusu lotu.",
        // Document Everything section
        takePhotos: "Zrób zdjęcia wyświetlaczy",
        takePhotosDesc: "Zrób wyraźne zdjęcia tablic informacyjnych pokazujących opóźnienie - mogą się przydać później",
        keepDocuments: "Zachowaj wszystkie dokumenty",
        keepDocumentsDesc: "Zachowaj kartę pokładową i wiadomości od linii lotniczej dotyczące opóźnienia",
        // 2+ Hour Delay section
        freeMeals: "Bezpłatne posiłki i napoje",
        freeMealsDesc: "Przy opóźnieniach 2+ godzin, linie muszą zapewnić jedzenie i napoje odpowiednie do czasu oczekiwania.",
        phoneCalls: "Dwa telefony lub emaile",
        phoneCallsDesc: "Masz prawo do wykonania połączeń lub wysłania emaili na koszt linii.",
        wifi: "Środki komunikacji",
        wifiDesc: "Linie powinny zapewnić możliwość komunikacji w sprawie Twojej sytuacji.",
        // 4+ Hour Delay section
        additionalMeals: "Dodatkowa opieka",
        additionalMealsDesc: "Przy dłuższych opóźnieniach, linie muszą kontynuować zapewnianie odpowiedniej opieki.",
        reroutingOptions: "Opcje zmiany trasy",
        reroutingOptionsDesc: "Możesz wybrać między alternatywnymi lotami a pełnym zwrotem kosztów, jeśli opóźnienie jest zbyt długie.",
        loungeAccess: "Access to the airline lounge",
        loungeAccessDesc: "Many airlines provide lounge access for comfortable waiting during long delays.",
        // Overnight Delay section
        hotelAccommodation: "Zakwaterowanie w hotelu",
        hotelAccommodationDesc: "Przy opóźnieniach z noclegiem, linie muszą zapewnić i zorganizować pobyt w hotelu.",
        transport: "Transport do/z hotelu",
        transportDesc: "Bezpłatny transport między lotniskiem a hotelem musi być zapewniony.",
        multipleMeals: "Ciągła opieka",
        multipleMealsDesc: "Masz prawo do posiłków i napojów przez cały czas trwania opóźnienia.",
        cancelOption: "Prawo do zwrotu",
        cancelOptionDesc: "Przy długich opóźnieniach możesz wybrać anulowanie podróży i otrzymać pełny zwrot kosztów.",
        // Weather compensation section
        weatherCompensation: "A co w przypadku złej pogody?",
        weatherCompensationDesc: "Podczas opóźnień pogodowych nadal otrzymasz opiekę (posiłki, hotel jeśli potrzebny), ale odszkodowanie może nie przysługiwać, jeśli opóźnienie było spowodowane poważnymi warunkami pogodowymi.",
        weatherCompensationNote: "Jednak jeśli opóźnienie było spowodowane nieprzygotowaniem linii do prognozowanych warunków pogodowych, możesz kwalifikować się do odszkodowania.",
        weatherCompensationTip: "Zawsze dokumentuj dokładną przyczynę podaną dla opóźnienia oraz warunki pogodowe.",
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
        pageSubtitle: "Dowiedz się, jakie wsparcie jest dostępne",
        // Status messages
        statusSuspended: "Istnieje możliwość zawieszenia operacji lotniskowych. Zalecane sprawdzenie statusu lotu u przewoźnika.",
        statusMajorDisruption: "Możliwe znaczące zakłócenia. Zalecane sprawdzenie statusu lotu u przewoźnika.",
        statusMinorDelays: "Możliwe niewielkie opóźnienia. Zalecane regularne sprawdzanie statusu lotu u przewoźnika.",
        statusNormal: "Aktualne warunki pogodowe sprzyjają normalnym operacjom.",
        // Additional alert messages
        laterInDay: "Prognozy wskazują na możliwość przejściowego pogorszenia warunków pogodowych w ciągu dnia",
        checkStatus: "Zalecane sprawdzanie statusu lotu",
        withAirline: "u przewoźnika",
        directlyWithAirline: "bezpośrednio u przewoźnika w celu uzyskania aktualnych informacji",
        // Footer
        disclaimer: "Ta aplikacja nie jest oficjalną usługą Lotniska w Krakowie ani żadnego przewoźnika lotniczego. Służy wyłącznie celom informacyjnym i nie powinna być wykorzystywana jako podstawowe źródło informacji do planowania podróży lub podejmowania decyzji. Zawsze należy sprawdzać aktualne informacje bezpośrednio u przewoźnika lotniczego oraz w oficjalnych źródłach lotniskowych.",
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
            visibilityBelowMinimums: "👁️ Słaba widoczność",
            
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
            operationsSuspended: "⛔ Słaba widoczność",
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
        riskLevel4Title: "Trudne warunki pogodowe",
        riskLevel4Message: "Możliwe zawieszenie operacji",
        riskLevel4Status: "Ze względu na trudne warunki pogodowe możliwe jest zawieszenie operacji lotniczych. Zalecane sprawdzenie aktualnych informacji bezpośrednio u przewoźnika. Należy stosować się do oficjalnych komunikatów od przewoźnika dotyczących odprawy i obecności na lotnisku.",
        
        riskLevel3Title: "Alert pogodowy",
        riskLevel3Message: "Możliwe ograniczenia operacyjne",
        riskLevel3Status: "Możliwe opóźnienia przekraczające 30 minut. Zalecane sprawdzenie statusu lotu bezpośrednio u przewoźnika. Należy stosować się do oficjalnych komunikatów od przewoźnika dotyczących odprawy i obecności na lotnisku.",
        
        riskLevel2Title: "Niewielki wpływ warunków pogodowych",
        riskLevel2Message: "Możliwe niewielkie utrudnienia",
        riskLevel2Status: "Operacje lotnicze są realizowane, możliwe opóźnienia od 10 do 20 minut. Zalecane sprawdzenie statusu lotu bezpośrednio u przewoźnika. Należy stosować się do oficjalnych komunikatów od przewoźnika dotyczących odprawy i obecności na lotnisku.",
        
        riskLevel1Title: "Korzystne warunki pogodowe",
        riskLevel1Message: "Standardowe operacje",
        riskLevel1Status: "Aktualne warunki sprzyjają planowym operacjom lotniczym.",
        
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
            title: "Informacje o wpływie warunków pogodowych",
            description: "Poniższe informacje mają charakter orientacyjny i przedstawiają możliwy wpływ warunków pogodowych na operacje lotnicze.",
            whatToExpect: "Możliwe scenariusze:",
            whatToDo: "Sugerowane działania:",
            proTips: "Dodatkowe wskazówki",
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
                "Warto rozważyć zainstalowanie aplikacji mobilnej przewoźnika w celu otrzymywania aktualizacji",
                "Zalecane zapisanie numerów kontaktowych przewoźnika w telefonie",
                "Warto zachować kopię szczegółów rezerwacji"
            ]
        },
        banner: {
            significantDisruptions: "Prognozowana możliwość znaczących zakłóceń lotów",
            between: "w godzinach",
            and: "do",
            dueTo: "ze względu na",
            thatMayOccur: "które mogą wystąpić okresowo",
            temporaryConditions: "Prognozy wskazują na możliwość przejściowego pogorszenia warunków pogodowych w ciągu dnia",
            checkStatus: "Zalecane sprawdzenie statusu lotu bezpośrednio u przewoźnika"
        },
        // Compensation section
        compensationRights: "Krok 3: Zrozum swoje prawa",
        compensationTitle: "Co Warto Wiedzieć o EU261",
        compensationDesc: "Przy opóźnieniach powyżej 3 godzin, prawo UE przewiduje odszkodowanie do 600€, w zależności od długości lotu i przyczyny opóźnienia.",
        // Next steps section
        nextSteps: "Przewodnik szybkiego działania",
        nextStepsDesc: "Wykonaj te kroki, aby chronić swoje prawa i uzyskać pomoc:",
        nextStep1: "Dokumentuj wszystko - rób zdjęcia tablic informacyjnych i zachowuj całą korespondencję",
        nextStep2: "Zapytaj personel linii lotniczych o prawa EU261 i uzyskaj pisemne potwierdzenie opóźnienia",
        nextStep3: "Zachowaj paragony za wszelkie wydatki związane z opóźnieniem (posiłki, transport, itp.)",
        nextStepsTip: "Wskazówka: Używaj telefonu do robienia zdjęć wszystkich ważnych dokumentów i korespondencji",
        // Care rights section
        careRights: "Krok 2: Uzyskaj pomoc i wsparcie",
        getAssistance: "Wsparcie w Czasie Opóźnienia",
        getAssistanceDesc: "Linia lotnicza zapewni Ci posiłki, napoje i pomoże w komunikacji. Przy dłuższych opóźnieniach zorganizuje też hotel, jeśli będzie potrzebny.",
        // Flight distance categories
        shortHaulDelay: "Dla lotów do 1500 km: po 2 godzinach",
        mediumHaulDelay: "Dla lotów 1500-3500 km: po 3 godzinach",
        longHaulDelay: "Dla lotów powyżej 3500 km: po 4 godzinach",
        // Additional meals and care
        additionalMealsNote: "Linie muszą zapewnić dodatkowe posiłki i napoje odpowiednie do czasu oczekiwania",
        reroutingOptionsNote: "Możesz wybrać między alternatywnymi lotami a pełnym zwrotem kosztów, jeśli opóźnienie jest zbyt długie",
        // Hotel accommodation
        hotelTransportNote: "Bezpłatny transport między lotniskiem a hotelem musi być zapewniony",
        hotelQualityNote: "Hotel musi być odpowiedniego standardu, zazwyczaj 3-gwiazdkowy lub równoważny",
        // Communication rights
        communicationNote: "Obejmuje to połączenia telefoniczne, emaile lub faksy - dwie formy komunikacji na pasażera",
        // General care rights notes
        careRightsNote: "Te prawa przysługują niezależnie od przyczyny opóźnienia, nawet w nadzwyczajnych okolicznościach",
        careRightsImportant: "Zachowaj wszystkie paragony za wydatki - możesz ubiegać się o ich zwrot od linii lotniczej",
        // Timeline labels
        rightNow: "Natychmiast",
        within30Mins: "W ciągu 30 minut",
        after2Hours: "Po 2 godzinach",
        after3Hours: "Po 3 godzinach",
    }
} as const; 