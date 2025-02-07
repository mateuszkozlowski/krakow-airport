// src/components/PassengerRights.tsx
'use client';

import React, { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, Hotel, Info, Coffee, Shield, LucideIcon, MapPin, ArrowUpRight, Camera, FileText, MessageCircle, FileCheck, Utensils, Phone } from 'lucide-react';
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
    <div className="py-8 max-w-7xl mx-auto px-4 px-6">
            {/* Pro tip */}
      <div className="mx-auto mb-16">
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 border border-slate-100">
          <div className="flex gap-4">
            <div className="flex-none">
              <Info className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600">
              {t.proTip}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline steps */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="relative">
          {/* Vertical line */}
          <div 
            className="absolute left-8 w-0.5 bg-gradient-to-b from-blue-100 via-green-100 to-orange-100" 
            style={{ 
              top: '24px',
              height: 'calc(100% - 288px)'
            }}
          />

          {/* Step 1: Document */}
          <div className="relative flex gap-6 mb-12 group">
            <div className="flex-none">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 flex items-center justify-center transform transition-all group-hover:scale-110 group-hover:border-blue-200">
                <Camera className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="flex-1 pt-3">
              <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-xl p-6 border border-blue-100 transform transition-all group-hover:translate-x-1">
                <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  {t.documentEverything}
                  <span className="text-sm font-normal text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-full">
                    {t.rightNow}
                  </span>
                </h3>
                <div className="prose prose-slate prose-sm">
                  <ul className="space-y-3 marker:text-blue-500">
                    <li className="flex items-start gap-2">
                      <FileText className="h-5 w-5 text-blue-500 flex-none mt-0.5" />
                      <span>{t.takePhotosDesc}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileCheck className="h-5 w-5 text-blue-500 flex-none mt-0.5" />
                      <span>{t.keepDocumentsDesc}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Get Care & Assistance */}
          <div className="relative flex gap-6 mb-12 group">
            <div className="flex-none">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-50 to-white border-2 border-green-100 flex items-center justify-center transform transition-all group-hover:scale-110 group-hover:border-green-200">
                <Coffee className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="flex-1 pt-3">
              <div className="bg-gradient-to-br from-green-50/50 to-white rounded-xl p-6 border border-green-100 transform transition-all group-hover:translate-x-1">
                <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  {t.careRights}
                  <span className="text-sm font-normal text-green-600 bg-green-100/50 px-2 py-0.5 rounded-full">
                    {t.after2Hours}
                  </span>
                </h3>
                <div className="prose prose-slate prose-sm">
                  <div className="space-y-6">
                    {/* 2+ hours */}
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="flex gap-4 items-start">
                        <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 text-sm font-medium">2h</div>
                        <div>
                          <p className="font-medium text-slate-900">{t.freeMeals}</p>
                          <p className="text-sm text-slate-600 mb-2">{t.freeMealsDesc}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <span className="block w-1 h-1 rounded-full bg-green-500"></span>
                              {t.shortHaulDelay} (≤ 1500 km)
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <span className="block w-1 h-1 rounded-full bg-green-500"></span>
                              {t.mediumHaulDelay} (1500-3500 km)
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <span className="block w-1 h-1 rounded-full bg-green-500"></span>
                              {t.longHaulDelay} (&gt; 3500 km)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4+ hours */}
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="flex gap-4 items-start">
                        <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 text-sm font-medium">4h</div>
                        <div>
                          <p className="font-medium text-slate-900">{t.additionalMeals}</p>
                          <p className="text-sm text-slate-600 mb-2">{t.additionalMealsDesc}</p>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-start gap-2">
                              <Utensils className="h-4 w-4 text-green-500 flex-none mt-0.5" />
                              <p className="text-xs text-slate-500">{t.additionalMealsNote}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Clock className="h-4 w-4 text-green-500 flex-none mt-0.5" />
                              <p className="text-xs text-slate-500">{t.reroutingOptionsNote}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Overnight */}
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="flex gap-4 items-start">
                        <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                          <Hotel className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{t.hotelAccommodation}</p>
                          <p className="text-sm text-slate-600 mb-2">{t.hotelAccommodationDesc}</p>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-green-500 flex-none mt-0.5" />
                              <p className="text-xs text-slate-500">{t.hotelTransportNote}</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-green-500 flex-none mt-0.5" />
                              <p className="text-xs text-slate-500">{t.hotelQualityNote}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Communication */}
                    <div className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="flex gap-4 items-start">
                        <div className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{t.phoneCalls}</p>
                          <p className="text-sm text-slate-600 mb-2">{t.phoneCallsDesc}</p>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-start gap-2">
                              <MessageCircle className="h-4 w-4 text-green-500 flex-none mt-0.5" />
                              <p className="text-xs text-slate-500">{t.communicationNote}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Rights Note */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-green-500 flex-none mt-0.5" />
                        <div>
                          <p className="text-sm text-green-800">{t.careRightsNote}</p>
                          <p className="text-xs text-green-700 mt-1">{t.careRightsImportant}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Know Your Rights & Compensation */}
          <div className="relative flex gap-6 group">
            <div className="flex-none">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-50 to-white border-2 border-orange-100 flex items-center justify-center transform transition-all group-hover:scale-110 group-hover:border-orange-200">
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
            </div>
            <div className="flex-1 pt-3">
              <div className="bg-gradient-to-br from-orange-50/50 to-white rounded-xl p-6 border border-orange-100 transform transition-all group-hover:translate-x-1">
                <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  {t.compensationRights}
                  <span className="text-sm font-normal text-orange-600 bg-orange-100/50 px-2 py-0.5 rounded-full">
                    {t.after3Hours}
                  </span>
                </h3>
                <div className="prose prose-slate prose-sm">
                  <p className="text-orange-800 mb-4">{t.compensationDesc}</p>
                  <div className="bg-white rounded-lg p-4 border border-orange-100">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-orange-500 flex-none mt-0.5" />
                      <div>
                        <p className="text-sm text-orange-800">{t.weatherCompensationDesc}</p>
                        <div className="mt-4 text-sm">
                          {t.compensationInfo}
                          <a 
                            href="https://www.airhelp.com/pl/?utm_medium=affiliate&utm_source=pap&utm_campaign=aff-krkflights&utm_content=&a_aid=krkflights&a_bid=2f59c947"
                            target="_blank"
                            rel="sponsored noopener noreferrer"
                            className="text-orange-600 hover:underline font-medium"
                          >
                            {t.airHelpLink}
                          </a>
                          <span className="text-orange-600/75 text-xs">{t.sponsoredDisclosure}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className=" mx-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-6">{t.officialResources}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <a 
            href="https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl p-4 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-none">
              <ArrowUpRight className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-slate-900">{t.euGuide}</div>
              <div className="text-sm text-slate-600">{t.inEnglish}</div>
            </div>
          </a>

          <a 
            href="https://pasazerlotniczy.ulc.gov.pl/prawa-pasazera"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl p-4 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-none">
              <ArrowUpRight className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-slate-900">{t.civilAviation}</div>
              <div className="text-sm text-slate-600">{t.inPolish}</div>
            </div>
          </a>
        </div>
      </div>


    </div>
  );
}