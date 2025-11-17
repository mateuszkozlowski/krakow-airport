// src/components/PassengerRights.tsx
'use client';

import React from 'react';
import { 
  Euro, Clock, Hotel, Coffee, Phone, Camera, 
  CheckCircle2, Cloud, Info, ArrowUpRight, Receipt, Mail
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

export function PassengerRights() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8 sm:py-16">
        
        {/* Simple intro */}
        <div className="mb-12 sm:mb-16 max-w-3xl">
          <p className="text-xl text-slate-700 leading-relaxed mb-4">
            {language === 'en' 
              ? 'Take a deep breath. Flight delays happen, and you have rights.'
              : 'Weź głęboki oddech. Opóźnienia lotów się zdarzają, a ty masz prawa.'}
          </p>
          <p className="text-slate-600 leading-relaxed">
            {t.proTip}
          </p>
        </div>

        {/* Quick links */}
        <div className="mb-14 sm:mb-20 pb-12 sm:pb-16 border-b border-slate-200">
          <p className="text-sm font-medium text-slate-900 mb-3">
            {language === 'en' ? 'Check your flight:' : 'Sprawdź swój lot:'}
          </p>
          <div className="flex flex-wrap gap-2">
            <a 
              href="https://www.krakowairport.pl/en/departures.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors text-slate-700"
            >
              {language === 'en' ? 'Kraków Airport departures' : 'Odloty z Kraków Airport'}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
            <a 
              href="https://www.flightradar24.com/airport/krk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors text-slate-700"
            >
              Flightradar24
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            {language === 'en' 
              ? 'Also check your airline\'s app and email for updates'
              : 'Sprawdź też aplikację linii i email, aby otrzymać aktualizacje'}
          </p>
        </div>

        {/* Main content */}
        <div className="space-y-16 sm:space-y-24 mb-16 sm:mb-24">
          
          {/* Always entitled */}
          <div>
            <div className="mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                {language === 'en' ? 'What you\'re entitled to' : 'Co ci się należy'}
              </h2>
              <p className="text-slate-600 text-lg">
                {language === 'en' 
                  ? 'These apply no matter what caused the delay'
                  : 'To przysługuje niezależnie od przyczyny opóźnienia'}
              </p>
            </div>

            <div className="space-y-8">
              {/* After 2 hours */}
              <div className="border-l-4 border-green-600 pl-6 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <Coffee className="h-5 w-5 text-green-700" />
                  <span className="font-semibold text-lg text-slate-900">{t.after2Hours}</span>
                </div>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    <span>{t.freeMealsDesc}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    <span>{t.phoneCallsDesc}</span>
                  </li>
                </ul>
              </div>

              {/* Overnight */}
              <div className="border-l-4 border-blue-600 pl-6 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <Hotel className="h-5 w-5 text-blue-700" />
                  <span className="font-semibold text-lg text-slate-900">{t.overnightDelay}</span>
                </div>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>{t.hotelAccommodationDesc}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>{t.hotelTransportNote}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-sm text-slate-700 flex items-start gap-2.5 leading-relaxed">
                  <Info className="h-5 w-5 text-slate-600 flex-none mt-0.5" />
                  <span><strong>{language === 'en' ? 'Important:' : 'Ważne:'}</strong> {t.careRightsImportant}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div>
            <div className="mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                {language === 'en' ? 'Financial compensation' : 'Odszkodowanie finansowe'}
              </h2>
              <p className="text-slate-600 text-lg">
                {language === 'en' 
                  ? 'For delays 3+ hours at arrival, if the airline was responsible'
                  : 'Za opóźnienia 3+ godzin przy dotarciu, jeśli linia była odpowiedzialna'}
              </p>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
              <div className="text-center p-5 sm:p-6 bg-slate-50 border-2 border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                <div className="text-4xl sm:text-5xl font-bold text-slate-900 mb-2">€250</div>
                <div className="text-xs sm:text-sm text-slate-600 leading-tight">
                  {language === 'en' ? 'up to 1,500 km' : 'do 1 500 km'}
                </div>
              </div>
              <div className="text-center p-5 sm:p-6 bg-slate-50 border-2 border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                <div className="text-4xl sm:text-5xl font-bold text-slate-900 mb-2">€400</div>
                <div className="text-xs sm:text-sm text-slate-600 leading-tight">
                  {language === 'en' ? '1,500-3,500 km' : '1 500-3 500 km'}
                </div>
              </div>
              <div className="text-center p-5 sm:p-6 bg-slate-50 border-2 border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                <div className="text-4xl sm:text-5xl font-bold text-slate-900 mb-2">€600</div>
                <div className="text-xs sm:text-sm text-slate-600 leading-tight">
                  {language === 'en' ? 'over 3,500 km' : 'powyżej 3 500 km'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="font-medium text-slate-900 mb-2">
                  {language === 'en' ? 'You may get compensation if:' : 'Możesz dostać odszkodowanie jeśli:'}
                </p>
                <ul className="space-y-1.5 text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-none mt-0.5" />
                    <span>
                      {language === 'en' 
                        ? 'The delay was caused by the airline (technical issues, crew problems, etc.)'
                        : 'Opóźnienie było spowodowane przez linię (problemy techniczne, kwestie załogi itp.)'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-none mt-0.5" />
                    <span>
                      {language === 'en' 
                        ? 'Your flight departed from an EU airport'
                        : 'Twój lot wyleciał z lotniska UE'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Cloud className="h-5 w-5 text-amber-700 flex-none mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 mb-1">
                      {language === 'en' ? 'Weather delays' : 'Opóźnienia pogodowe'}
                    </p>
                    <p className="text-sm text-amber-800">
                      {language === 'en'
                        ? 'You still get all the care rights above, but financial compensation typically doesn\'t apply for weather.'
                        : 'Nadal przysługują ci wszystkie prawa do opieki powyżej, ale odszkodowanie finansowe zazwyczaj nie przysługuje za pogodę.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Not sure if you qualify? - subtle CTA */}
            <div className="mt-8 p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-slate-700 mb-3 leading-relaxed">
                {language === 'en'
                  ? 'Not sure if you qualify for compensation? Companies like AirHelp can check your eligibility for free and handle the entire claim process if you do.'
                  : 'Nie jesteś pewien czy przysługuje ci odszkodowanie? Firmy takie jak AirHelp mogą sprawdzić twoje uprawnienia za darmo i załatwić całą sprawę jeśli ci przysługuje.'}
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://www.airhelp.com/pl/?utm_medium=affiliate&utm_source=pap&utm_campaign=aff-krkflights&utm_content=&a_aid=krkflights&a_bid=2f59c947"
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base"
                >
                  <span>{language === 'en' ? 'Check eligibility' : 'Sprawdź uprawnienia'}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <span className="text-xs text-slate-500">
                  {language === 'en' ? '(Free check, they only charge if successful)' : '(Darmowe sprawdzenie, płacisz tylko w razie sukcesu)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                {t.sponsoredDisclosure}
              </p>
            </div>
          </div>

          {/* Documentation */}
          <div>
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                {language === 'en' ? 'If you want to document things' : 'Jeśli chcesz coś udokumentować'}
              </h2>
              <p className="text-slate-600 text-lg">
                {language === 'en' 
                  ? 'These can help if you later file a claim, but don\'t stress if you can\'t'
                  : 'To może pomóc jeśli później złożysz roszczenie, ale nie stresuj się jeśli nie możesz'}
              </p>
            </div>

            <ul className="space-y-5 text-slate-700 text-base">
              <li className="flex items-start gap-4">
                <Camera className="h-6 w-6 text-slate-400 flex-none mt-0.5" />
                <span>
                  {language === 'en'
                    ? 'Take photos of information displays showing the delay'
                    : 'Zrób zdjęcia tablic informacyjnych pokazujących opóźnienie'}
                </span>
              </li>
              <li className="flex items-start gap-4">
                <Receipt className="h-6 w-6 text-slate-400 flex-none mt-0.5" />
                <span>
                  {language === 'en'
                    ? 'Keep receipts if you buy meals, transport, or hotel yourself'
                    : 'Zachowaj paragony jeśli sam kupisz posiłki, transport lub hotel'}
                </span>
              </li>
              <li className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-slate-400 flex-none mt-0.5" />
                <span>
                  {language === 'en'
                    ? 'Save your boarding pass and any emails from the airline'
                    : 'Zachowaj kartę pokładową i emaile od linii'}
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Official resources */}
        <div className="border-t border-slate-200 pt-12">
          <h3 className="text-base font-semibold text-slate-900 mb-4">{t.officialResources}</h3>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span>{t.euGuide}</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="https://pasazerlotniczy.ulc.gov.pl/prawa-pasazera"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span>{t.civilAviation}</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
