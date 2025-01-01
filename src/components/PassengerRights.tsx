// src/components/PassengerRights.tsx
'use client';

import React, { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Clock, Hotel, Phone, Info, MapPin, Coffee, Shield, LucideIcon } from 'lucide-react';

interface InfoSectionProps {
  title: string;
  children: ReactNode;
  icon: LucideIcon;
}

const InfoSection = ({ title, children, icon: Icon }: InfoSectionProps) => (
  <div className="rounded-lg border bg-card p-4 mb-4">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-5 w-5 text-blue-500" />
      <h3 className="font-semibold">{title}</h3>
    </div>
    {children}
  </div>
);

interface ContactItemProps {
  label: string;
  value: string;
}

const ContactItem = ({ label, value }: ContactItemProps) => (
  <div className="flex items-center justify-between rounded-md bg-muted p-3">
    <span className="text-sm font-medium">{label}</span>
    <span className="font-mono text-sm">{value}</span>
  </div>
);

export function PassengerRights() {
  return (
    <div className="py-8">
      <Alert className="mb-6">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Important: We are not affiliated with any airline or Kraków Airport. 
          Our goal is to help you understand and claim your EU261 rights during disruptions.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="immediate" className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger 
            value="immediate" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm hover:bg-white/80 transition-colors"
          >
            Get Help Now
          </TabsTrigger>
          <TabsTrigger 
            value="support"
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm hover:bg-white/80 transition-colors"
          >
            Your Rights
          </TabsTrigger>
          <TabsTrigger 
            value="rights"
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm hover:bg-white/80 transition-colors"
          >
            Next Steps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="immediate" className="mt-4">
          <InfoSection title="Immediate Actions at Kraków Airport" icon={Info}>
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3">
                <p className="font-medium mb-2">1. Locate Airline Support</p>
                <ul className="ml-6 list-disc space-y-1 text-sm">
                  <li>Airlines have desks in Terminal 1 - main level</li>
                  <li>Request written confirmation of delay/cancellation</li>
                  <li>Insist on your EU261 rights for care and assistance</li>
                  <li>Get all promises in writing - take photos of documents</li>
                </ul>
              </div>
              
              <div className="rounded-md bg-muted p-3">
                <p className="font-medium mb-2">2. Document Everything</p>
                <ul className="ml-6 list-disc space-y-1 text-sm">
                  <li>Take photos of information displays (located throughout T1)</li>
                  <li>Keep all boarding passes and receipts</li>
                  <li>Record staff names and badge numbers</li>
                  <li>Save all communication with airlines</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <ContactItem 
                  label="Polish Civil Aviation Authority" 
                  value="+48 22 520 72 00"
                />
                <ContactItem 
                  label="European Consumer Centre Poland" 
                  value="+48 22 556 01 18"
                />
              </div>
            </div>
          </InfoSection>
        </TabsContent>

        <TabsContent value="support" className="mt-4 space-y-4">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Under EU261, you have strong rights regardless of the reason for delay. These apply to all flights 
              departing from Kraków Airport or EU airlines flying to Kraków.
            </AlertDescription>
          </Alert>
          
          <Accordion type="single" collapsible>
            <AccordionItem value="short">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Coffee className="h-5 w-5 text-yellow-500" />
                  <span>2+ Hours: Basic Care Rights</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <InfoSection title="You must receive:" icon={Shield}>
                  <ul className="ml-6 list-disc space-y-2">
                    <li>Meal vouchers (insist if not offered)</li>
                    <li>Two phone calls or emails (ask for Wi-Fi access)</li>
                    <li>Written confirmation of delay</li>
                    <li>Clear information about your rights</li>
                  </ul>
                </InfoSection>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="medium">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span>4+ Hours: Extended Rights</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <InfoSection title="Additional rights include:" icon={Shield}>
                  <ul className="ml-6 list-disc space-y-2">
                    <li>Additional meal vouchers - don't hesitate to ask</li>
                    <li>Right to rerouting options</li>
                    <li>Access to the airline's lounge (request it)</li>
                    <li>Written explanation of your rights and options</li>
                  </ul>
                </InfoSection>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="overnight">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-blue-500" />
                  <span>Overnight: Full Protection</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <InfoSection title="Demand these rights:" icon={Shield}>
                  <ul className="ml-6 list-disc space-y-2">
                    <li>Hotel accommodation - don't accept 'no availability' excuses</li>
                    <li>Transport to/from hotel - keep taxi receipts if needed</li>
                    <li>Multiple meal vouchers for each day</li>
                    <li>Option to cancel with full refund</li>
                    <li>Written confirmation of all arrangements</li>
                  </ul>
                </InfoSection>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="rights" className="mt-4">
          <InfoSection title="Claim Your EU261 Rights" icon={Shield}>
            <p className="text-sm text-muted-foreground mb-4">
              For flights departing Kraków Airport or EU airlines flying to Kraków, you&apos;re entitled to:
            </p>
            <ul className="ml-6 list-disc space-y-2 mb-4">
              <li>Up to €600 compensation for eligible delays over 3 hours</li>
              <li>Care and assistance regardless of delay cause</li>
              <li>Rerouting or refund options for cancellations</li>
              <li>Hotel accommodation for overnight delays</li>
            </ul>
            
            <Accordion type="single" collapsible>
              <AccordionItem value="care">
                <AccordionTrigger>If Airlines Refuse Help</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm">
                    1. State clearly that you know your EU261 rights
                    <ul className="ml-6 list-disc mt-2">
                      <li>Reference Article 9 - Right to Care</li>
                      <li>Ask for the refusal in writing</li>
                      <li>Contact the national enforcement body immediately</li>
                      <li>Keep receipts for all expenses - they must be reimbursed</li>
                    </ul>
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="next">
                <AccordionTrigger>After Your Flight</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm">
                    Submit a formal complaint:
                    <ul className="ml-6 list-disc mt-2">
                      <li>Send a registered letter to the airline (keep proof)</li>
                      <li>Include all documentation and photos</li>
                      <li>Set a 14-day deadline for response</li>
                      <li>Consider assistance from passenger rights organizations</li>
                    </ul>
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </InfoSection>
        </TabsContent>
      </Tabs>

      <Alert variant="default" className="mt-6">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Pro tip: Join forces with other passengers. Share information and support each other. 
          Airlines are more responsive to group requests. Take photos of everything and get all promises in writing.
        </AlertDescription>
      </Alert>
    </div>
  );
}