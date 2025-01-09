// src/components/PassengerRights.tsx
'use client';

import React, { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, Hotel, Info, Coffee, Shield, LucideIcon, MapPin, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

interface InfoSectionProps {
  title: string;
  children: ReactNode;
  icon: LucideIcon;
}

export function PassengerRights() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="py-8">
      <Alert variant="default" className="mb-8">
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t.proTip}
        </AlertDescription>
      </Alert>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-slate-900">
              {t.whatToDoNow}
            </h2>
            
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-900">
                {t.stayAtGate}
              </AlertDescription>
            </Alert>
            
            <Accordion type="single" collapsible className="space-y-2" defaultValue="gate">
              <AccordionItem value="gate">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">{t.atYourGate}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">{t.speakWithStaff}</div>
                      <div className="text-slate-600">{t.speakWithStaffDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.requestConfirmation}</div>
                      <div className="text-slate-600">{t.requestConfirmationDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.askAboutRights}</div>
                      <div className="text-slate-600">{t.askAboutRightsDesc}</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="landside">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">{t.beforeSecurity}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">{t.visitAirlineDesk}</div>
                      <div className="text-slate-600">{t.visitAirlineDeskDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.getInWriting}</div>
                      <div className="text-slate-600">{t.getInWritingDesc}</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="document">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    <span className="font-medium">{t.documentEverything}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">{t.takePhotos}</div>
                      <div className="text-slate-600">{t.takePhotosDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.keepDocuments}</div>
                      <div className="text-slate-600">{t.keepDocumentsDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.noteStaffDetails}</div>
                      <div className="text-slate-600">{t.noteStaffDetailsDesc}</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-slate-900">
              {t.rightsBasedOnDelay}
            </h2>

            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem value="2hours">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">{t.twoHourDelay}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">{t.freeMeals}</div>
                      <div className="text-slate-600">{t.freeMealsDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.phoneCalls}</div>
                      <div className="text-slate-600">{t.phoneCallsDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.wifi}</div>
                      <div className="text-slate-600">{t.wifiDesc}</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="4hours">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">{t.fourHourDelay}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">{t.additionalMeals}</div>
                      <div className="text-slate-600">{t.additionalMealsDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.reroutingOptions}</div>
                      <div className="text-slate-600">{t.reroutingOptionsDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.loungeAccess}</div>
                      <div className="text-slate-600">{t.loungeAccessDesc}</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="overnight">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">{t.overnightDelay}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">{t.hotelAccommodation}</div>
                      <div className="text-slate-600">{t.hotelAccommodationDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.transport}</div>
                      <div className="text-slate-600">{t.transportDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.multipleMeals}</div>
                      <div className="text-slate-600">{t.multipleMealsDesc}</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">{t.cancelOption}</div>
                      <div className="text-slate-600">{t.cancelOptionDesc}</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-900">
              {t.officialResources}
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">{t.inEnglish}</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a 
                      href="https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {t.euGuide}
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://europa.eu/youreurope/citizens/travel/passenger-rights/air/faq/index_en.htm" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {t.faq}
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">{t.inPolish}</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a 
                      href="https://pasazerlotniczy.ulc.gov.pl/prawa-pasazera" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {t.civilAviation}
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://www.gov.pl/web/infrastruktura/prawa-pasazera1" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {t.ministry}
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
                <MapPin className="h-4 w-4 text-blue-500" />
                {t.airportInfo}
              </h3>
              
              <div className="space-y-5 text-sm">
                <div className="text-slate-600">
                  <span className="font-medium">{t.mainTerminal}</span>{' '}
                  <span className="text-slate-700">{t.mainTerminalDesc}</span>
                </div>

                <div className="text-slate-600">
                  <span className="font-medium">{t.callCenter}</span>{' '}
                  <a href="tel:+48122955800" className="font-medium text-slate-700 hover:text-blue-500 transition-colors">
                    +48 12 295 58 00
                  </a>
                  {' / '}
                  <a href="tel:0801055000" className="font-medium text-slate-700 hover:text-blue-500 transition-colors">
                    0 801 055 000
                  </a>
                </div>

                <div>
                  <div className="text-slate-900 font-bold mb-2.5">
                    {t.ticketOffices}
                    <span className="font-normal text-slate-600"> {t.ticketOfficesDesc}</span>
                  </div>
                  <ul className="mt-2 space-y-2.5 text-slate-600">
                    <li>
                      <span className="font-medium text-slate-900">{t.lotOffice}</span>{' '}
                      {t.lotOfficeDesc}{' '}
                      <a href="tel:+48122855128" className="font-medium text-slate-700 hover:text-blue-500 transition-colors">
                        Tel: +48 12 285 51 28
                      </a>
                    </li>
                    <li>
                      <span className="font-medium text-slate-900">{t.turkishOffice}</span>{' '}
                      {t.turkishOfficeDesc}
                    </li>
                    <li>
                      <span className="font-medium text-slate-900">{t.otherAirlines}</span>{' '}
                      <span className="text-slate-500">
                        {t.otherAirlinesDesc}
                      </span>:{' '}
                      {t.otherAirlinesHours}
                    </li>
                  </ul>
                </div>

                <div className="border-t pt-4 text-slate-500 text-xs">
                  <span className="font-medium">{t.needHelp}</span> {t.visitGateDesk}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}