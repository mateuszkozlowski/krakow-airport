// lib/utils/retry.ts
type RetryConfig = {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  logger?: (msg: string) => void; // Optional logger
};

class HttpError extends Error {
  statusCode: number;
  headers?: Record<string, string>;

  constructor(message: string, statusCode: number, headers?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.headers = headers;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = 10,
    baseDelay = 1000,
    maxDelay = 5000,
    logger = console.log, // Default logger
  }: RetryConfig = {}
): Promise<T> {
  let lastError: Error = new Error("No attempts made");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Handle 429 errors specifically
      if (error instanceof HttpError && error.statusCode === 429) {
        const retryAfter = error.headers?.["Retry-After"];
        const delay = retryAfter
          ? parseRetryAfter(retryAfter) // Parse the Retry-After header
          : Math.min(
              Math.random() * (baseDelay * Math.pow(2, attempt - 1)) + baseDelay / 2,
              maxDelay
            );

        logger(
          `Attempt ${attempt} failed with 429 Too Many Requests. Retrying in ${Math.round(delay)}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue; // Retry the next attempt
      }

      // For other errors, handle retries
      if (attempt === maxAttempts) {
        break;
      }

      const delay = Math.min(
        Math.random() * (baseDelay * Math.pow(2, attempt - 1)) + baseDelay / 2,
        maxDelay
      );

      logger(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(
    `Failed after ${maxAttempts} attempts. Last error: ${lastError.message}`
  );
}

// Utility function to parse Retry-After header (seconds or HTTP date)
function parseRetryAfter(retryAfter: string): number {
  const delaySeconds = parseInt(retryAfter, 10);
  if (!isNaN(delaySeconds)) {
    return delaySeconds * 1000; // Convert to milliseconds
  }

  // Parse HTTP date if Retry-After is a date
  const retryDate = Date.parse(retryAfter);
  if (!isNaN(retryDate)) {
    return Math.max(0, retryDate - Date.now());
  }

  // Default to a fallback delay if parsing fails
  return 1000;
}
