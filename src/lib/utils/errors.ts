const GENERIC_FALLBACK = "Oops! Something went wrong. Please try again.";

const TECHNICAL_PATTERNS =
  /(duplicate key value|violates|constraint|relation |column |syntax error|invalid input syntax|permission denied|row-level security|jwt|fetch failed|Failed to fetch|NetworkError|ECONNREFUSED)/i;

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error_description === "string")
      return record.error_description;
    if (typeof record.error === "string") return record.error;
  }
  return "";
}

/**
 * Turns any thrown value into a user-friendly message.
 * Raw database/Postgrest errors are never shown to the user.
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = GENERIC_FALLBACK,
): string {
  const message = extractMessage(error).trim();
  if (!message) return fallback;

  if (/invalid login credentials/i.test(message)) {
    return "Email or password is incorrect.";
  }
  if (/email not confirmed/i.test(message)) {
    return "This email address is not confirmed yet.";
  }
  if (/rate limit/i.test(message)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (/Not authenticated/i.test(message)) {
    return "Your session has expired. Please log in again.";
  }
  if (/Profile not found/i.test(message)) {
    return "Your account is not set up yet. Please contact the owner.";
  }
  if (/Cart is empty/i.test(message)) return "Your cart is empty.";
  if (/Not authorized/i.test(message)) {
    return "You do not have permission to do that.";
  }
  if (/Queue item not found/i.test(message)) {
    return "This item is no longer in the queue. Please refresh.";
  }
  if (/Payment amount is less/i.test(message)) {
    return "Payment amount is less than the total.";
  }
  if (/Insufficient stock/i.test(message)) return message;
  if (/not available/i.test(message)) return message;
  if (/Could not find the function|schema cache/i.test(message)) {
    return "This feature is not installed yet. Please run the latest database migration.";
  }
  if (/Could not find the .* (column|relation)|column .* does not exist/i.test(message)) {
    return "This feature is not installed yet. Please run the latest database migration.";
  }
  if (/Topping not found|Invalid topping/i.test(message)) {
    return "One of the toppings is no longer available. Please refresh and try again.";
  }
  if (/Product not found/i.test(message)) {
    return "One of the products is no longer available. Please refresh.";
  }
  if (TECHNICAL_PATTERNS.test(message)) return fallback;

  return message;
}

export const GENERIC_ERROR = GENERIC_FALLBACK;
