// src/components/PassengerRights.tsx
'use client';

import React, { ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, Hotel, Info, Coffee, Shield, LucideIcon, MapPin, ArrowUpRight } from 'lucide-react';

interface InfoSectionProps {
  title: string;
  children: ReactNode;
  icon: LucideIcon;
}

export function PassengerRights() {
  return (
    <div className="py-8">
      <Alert variant="default" className="mb-8">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Pro tip: Join forces with other passengers - airlines are more responsive to group requests. 
          Document everything and get all promises in writing.
        </AlertDescription>
      </Alert>
      
      <Alert variant="default" className="mb-8 bg-green-50 border-green-200">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-green-900 mt-0.5">
            Need help claiming compensation? Get professional support with your claim.
          </span>
          <a 
            href="https://www.airhelp.com/pl/?utm_medium=affiliate&utm_source=pap&utm_campaign=aff-krkflights&utm_content=&a_aid=krkflights&a_bid=2f59c947"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 hover:text-green-800 font-medium flex items-center gap-1 mt-0.5"
          >
            Check eligibility
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </AlertDescription>
      </Alert>
      

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-slate-900">
              What to Do Right Now
            </h2>
            
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-900">
                Important: If you've already passed security, stay at your gate! Ask gate staff for assistance first.
              </AlertDescription>
            </Alert>
            
            <Accordion type="single" collapsible className="space-y-2" defaultValue="gate">
              <AccordionItem value="gate">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">At Your Gate</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">Speak with gate staff</div>
                      <div className="text-slate-600">They can provide immediate updates and assistance with your flight.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Request written confirmation</div>
                      <div className="text-slate-600">Ask for official documentation of any delay or cancellation.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Ask about EU261 rights</div>
                      <div className="text-slate-600">Staff must inform you about care and assistance you're entitled to.</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="landside">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Before Security (Main Terminal)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">Visit airline desk</div>
                      <div className="text-slate-600">If you haven't passed security yet, airline desks in Terminal 1 can help with rebooking and assistance.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Get everything in writing</div>
                      <div className="text-slate-600">Request written confirmation of any arrangements or promises made.</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="document">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Document Everything</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">Take photos of displays</div>
                      <div className="text-slate-600">These screens show official flight status and delay times - important evidence for your claim.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Keep all documents</div>
                      <div className="text-slate-600">Save boarding passes, receipts, and any written communications from the airline.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Note staff details</div>
                      <div className="text-slate-600">Record names and badge numbers of staff you speak with about your situation.</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-slate-900">
              Your Rights Based on Delay Duration
            </h2>

            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem value="2hours">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">2+ Hour Delay</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">Free meals and refreshments</div>
                      <div className="text-slate-600">Airlines must provide food and drinks appropriate to the time of day and delay length.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Two phone calls or emails</div>
                      <div className="text-slate-600">You can contact family or make alternative arrangements at the airline's expense.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Access to airport Wi-Fi</div>
                      <div className="text-slate-600">Stay connected and updated about your flight status.</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="4hours">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">4+ Hour Delay</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">Additional meal vouchers</div>
                      <div className="text-slate-600">For longer delays, airlines must provide additional meals appropriate to the waiting time.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Rerouting options</div>
                      <div className="text-slate-600">You can choose between alternative flights or a full refund if the delay is too long.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Access to the airline lounge</div>
                      <div className="text-slate-600">Many airlines provide lounge access for comfortable waiting during long delays.</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="overnight">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Hotel className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Overnight Delay</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <ul className="ml-7 space-y-3 text-sm text-slate-600">
                    <li>
                      <div className="font-medium text-slate-700">Hotel accommodation</div>
                      <div className="text-slate-600">Airlines must provide and arrange your hotel stay if you need to wait overnight.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Transport to/from the hotel</div>
                      <div className="text-slate-600">Free transport between the airport and hotel must be provided or reimbursed.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Multiple meal vouchers</div>
                      <div className="text-slate-600">You're entitled to meals for the entire duration of your extended delay.</div>
                    </li>
                    <li>
                      <div className="font-medium text-slate-700">Option to cancel with a full refund</div>
                      <div className="text-slate-600">If the delay is too long, you can choose to cancel your journey and get your money back.</div>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-900">
              Official Resources
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">In English</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a 
                      href="https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      EU Air Passenger Rights Guide
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
                      FAQ
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3">Po polsku</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a 
                      href="https://pasazerlotniczy.ulc.gov.pl/prawa-pasazera" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-500 hover:underline flex items-center gap-1"
                    >
                      Urząd Lotnictwa Cywilnego
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
                      Ministerstwo Infrastruktury
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
                Airport Info
              </h3>
              
              <div className="space-y-5 text-sm">
                <div className="text-slate-600">
                  <span className="font-medium">Main Terminal & Check-in:</span>{' '}
                  <span className="text-slate-700">Open during flight ops.</span>
                </div>

                <div className="text-slate-600">
                  <span className="font-medium">Call Center:</span>{' '}
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
                    Ticket Offices
                    <span className="font-normal text-slate-600"> (Main Terminal, near check-in):</span>
                  </div>
                  <ul className="mt-2 space-y-2.5 text-slate-600">
                    <li>
                      <span className="font-medium text-slate-900">PLL LOT & Star Alliance:</span>{' '}
                      Open during airline ops.{' '}
                      <a href="tel:+48122855128" className="font-medium text-slate-700 hover:text-blue-500 transition-colors">
                        Tel: +48 12 285 51 28
                      </a>
                    </li>
                    <li>
                      <span className="font-medium text-slate-900">Turkish Airlines:</span>{' '}
                      Open 4 hrs before to 1 hr after departure.
                    </li>
                    <li>
                      <span className="font-medium text-slate-900">Other Airlines</span>{' '}
                      <span className="text-slate-500">
                        (Norwegian, Finnair, SWISS, Lufthansa, BA, easyJet, Ryanair, etc.)
                      </span>:{' '}
                      Open during ops.
                    </li>
                  </ul>
                </div>

                <div className="border-t pt-4 text-slate-500 text-xs">
                  <span className="font-medium">Need help?</span> Visit any gate desk during operational hours.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 mb-8">
        <div className="rounded-lg border bg-gradient-to-br from-green-50 to-white p-6">
          <h2 className="text-xl font-bold mb-3 text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Need Help with Your Claim?
          </h2>
          <p className="text-slate-600 mb-4">
            Don't want to handle the claim process yourself? Professional services can help you get the compensation you deserve, even for flights from up to 3 years ago.
          </p>
          <a 
            href="https://www.airhelp.com/pl/?utm_medium=affiliate&utm_source=pap&utm_campaign=aff-krkflights&utm_content=&a_aid=krkflights&a_bid=2f59c947"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Check Your Eligibility
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>

    </div>
  );
}