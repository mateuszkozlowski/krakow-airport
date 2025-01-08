export const TIME_OFFSET = {
  WINTER: 3600000, // +1 hour in milliseconds
  SUMMER: 7200000  // +2 hours in milliseconds
} as const;

export function isDST(date: Date = new Date()): boolean {
  // Get year from the input date
  const year = date.getFullYear();
  
  // Last Sunday in March (start of DST at 2:00 AM Warsaw time)
  const dstStart = new Date(year, 2, 31); // March 31
  dstStart.setDate(dstStart.getDate() - dstStart.getDay()); // Go back to last Sunday
  dstStart.setHours(2, 0, 0, 0); // Set to 2:00 AM Warsaw time
  
  // Last Sunday in October (end of DST at 3:00 AM Warsaw time)
  const dstEnd = new Date(year, 9, 31); // October 31
  dstEnd.setDate(dstEnd.getDate() - dstEnd.getDay()); // Go back to last Sunday
  dstEnd.setHours(3, 0, 0, 0); // Set to 3:00 AM Warsaw time
  
  // Convert input date to Warsaw time
  const warsawTime = new Date(date.getTime());
  
  // Check if date is within DST period
  return warsawTime >= dstStart && warsawTime < dstEnd;
}

export function getTimeOffset(date: Date = new Date()): number {
  return isDST(date) ? TIME_OFFSET.SUMMER : TIME_OFFSET.WINTER;
}

export function adjustToWarsawTime(date: Date): Date {
  const warsawDate = new Date(date.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));
  const localDate = new Date(date.toLocaleString('en-GB'));
  const offset = warsawDate.getTime() - localDate.getTime();
  
  return new Date(date.getTime() + offset);
}
