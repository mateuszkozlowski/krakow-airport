// src/components/PassengerRights.tsx
'use client';

import React from 'react';
import { Hotel, Info, Coffee, Shield, MapPin, ArrowUpRight, Camera, FileText, FileCheck, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

export function PassengerRights() {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="py-6 sm:py-12 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Pro tip */}
      <div className="mx-auto mb-8 sm:mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 p-5 sm:p-7 shadow-sm">
          <div className="flex gap-4">
            <div className="flex-none mt-0.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-sm">
                <Info className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium">
              {t.proTip}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline steps */}
      <div className="max-w-4xl mx-auto mb-8 sm:mb-12">
        <div className="relative space-y-6 sm:space-y-8">
          {/* Vertical line */}
          <div 
            className="absolute left-6 sm:left-9 w-0.5 bg-gradient-to-b from-blue-300 via-green-300 to-orange-300" 
            style={{ 
              top: '32px',
              height: 'calc(100% - 64px)'
            }}
          />

          {/* Step 1: Document */}
          <div className="relative flex gap-4 sm:gap-6 group">
            <div className="flex-none z-10">
              <div className="w-12 h-12 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                <Camera className="h-6 w-6 sm:h-9 sm:w-9 text-white" />
              </div>
            </div>
            <div className="flex-1 pb-2">
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-blue-200 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:border-blue-300">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.documentEverything}
                  </h3>
                  <span className="text-xs sm:text-sm font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                    {t.rightNow}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-none mt-1">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{t.takePhotosDesc}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-none mt-1">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FileCheck className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{t.keepDocumentsDesc}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Get Care & Assistance */}
          <div className="relative flex gap-4 sm:gap-6 group">
            <div className="flex-none z-10">
              <div className="w-12 h-12 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                <Coffee className="h-6 w-6 sm:h-9 sm:w-9 text-white" />
              </div>
            </div>
            <div className="flex-1 pb-2">
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-green-200 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:border-green-300">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.careRights}
                  </h3>
                  <span className="text-xs sm:text-sm font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                    {t.after2Hours}
                  </span>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  {/* 2+ hours */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex gap-3 items-start">
                      <div className="flex-none">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">2h</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-base text-slate-900 mb-1">{t.freeMeals}</p>
                        <p className="text-sm text-slate-700 mb-2">{t.freeMealsDesc}</p>
                        <div className="space-y-1 text-xs text-slate-600">
                          <p className="flex items-center gap-1.5">
                            <span className="block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            {t.shortHaulDelay} (≤ 1500 km)
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            {t.mediumHaulDelay} (1500-3500 km)
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            {t.longHaulDelay} (&gt; 3500 km)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4+ hours */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex gap-3 items-start">
                      <div className="flex-none">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">4h</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-base text-slate-900 mb-1">{t.additionalMeals}</p>
                        <p className="text-sm text-slate-700">{t.additionalMealsDesc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Overnight */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex gap-3 items-start">
                      <div className="flex-none">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                          <Hotel className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-base text-slate-900 mb-1">{t.hotelAccommodation}</p>
                        <p className="text-sm text-slate-700 mb-3">{t.hotelAccommodationDesc}</p>
                        <div className="space-y-2 pl-1">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-green-600 flex-none mt-0.5" />
                            <p className="text-xs text-slate-600">{t.hotelTransportNote}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-green-600 flex-none mt-0.5" />
                            <p className="text-xs text-slate-600">{t.hotelQualityNote}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Communication */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex gap-3 items-start">
                      <div className="flex-none">
                        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-base text-slate-900 mb-1">{t.phoneCalls}</p>
                        <p className="text-sm text-slate-700">{t.phoneCallsDesc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Important Note */}
                  <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-xl p-4 border border-green-300">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-green-700 flex-none mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-900">{t.careRightsNote}</p>
                        <p className="text-xs text-green-800">{t.careRightsImportant}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Know Your Rights & Compensation */}
          <div className="relative flex gap-4 sm:gap-6 group">
            <div className="flex-none z-10">
              <div className="w-12 h-12 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                <Shield className="h-6 w-6 sm:h-9 sm:w-9 text-white" />
              </div>
            </div>
            <div className="flex-1 pb-2">
              <div className="bg-white rounded-2xl p-5 sm:p-7 border border-orange-200 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:border-orange-300">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.compensationRights}
                  </h3>
                  <span className="text-xs sm:text-sm font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
                    {t.after3Hours}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{t.compensationDesc}</p>
                  
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-orange-600 flex-none mt-0.5" />
                      <div className="flex-1 space-y-4">
                        <p className="text-sm text-slate-700 leading-relaxed">{t.weatherCompensationDesc}</p>
                        
                        <div className="pt-4 border-t border-orange-200">
                          <p className="text-sm text-slate-700 mb-3">{t.compensationInfo}</p>
                          <div className="space-y-2">
                            <a 
                              href="https://www.airhelp.com/pl/?utm_medium=affiliate&utm_source=pap&utm_campaign=aff-krkflights&utm_content=&a_aid=krkflights&a_bid=2f59c947"
                              target="_blank"
                              rel="sponsored noopener noreferrer"
                              className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors group/link"
                            >
                              <span>{t.airHelpLink}</span>
                              <ArrowUpRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                            </a>
                            <p className="text-xs text-slate-500">{t.sponsoredDisclosure}</p>
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
      </div>

      {/* Resources */}
      <div className="mx-auto max-w-4xl">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">{t.officialResources}</h2>
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          <a 
            href="https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 sm:gap-4 rounded-xl p-4 sm:p-5 bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all duration-300"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-none group-hover:bg-blue-100 transition-colors">
              <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base sm:text-lg text-slate-900 mb-0.5">{t.euGuide}</div>
              <div className="text-sm text-slate-600">{t.inEnglish}</div>
            </div>
          </a>

          <a 
            href="https://pasazerlotniczy.ulc.gov.pl/prawa-pasazera"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 sm:gap-4 rounded-xl p-4 sm:p-5 bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all duration-300"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-50 flex items-center justify-center flex-none group-hover:bg-blue-100 transition-colors">
              <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base sm:text-lg text-slate-900 mb-0.5">{t.civilAviation}</div>
              <div className="text-sm text-slate-600">{t.inPolish}</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}