// lib/utils/retry.ts
type RetryConfig = {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
};


export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 5000
  }: RetryConfig = {}
): Promise<T> {
  let lastError: Error = new Error('No attempts made');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        Math.random() * baseDelay * Math.pow(2, attempt - 1),
        maxDelay
      );

      console.log(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}