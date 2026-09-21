/**
 * money.ts
 * ----------------------------------------------------------------------------
 * Helpers for converting between the display representation of money
 * (a decimal string an admin types into a form, e.g. "24.99") and the
 * storage representation (integer minor units, e.g. 2499) used by the
 * `Money` type across the schema — see types/common.types.ts for why we
 * store minor units instead of floats.
 */
import type { Money } from '@/types/common.types';

const DEFAULT_CURRENCY = 'ZAR';

/** Parses a decimal-string price (as typed into a form) into minor units.
 *  Returns null if the input isn't a valid non-negative number. */
export function parseMoneyInput(input: string, currency: string = DEFAULT_CURRENCY): Money | null {
  const trimmed = input.trim();
  if (trimmed === '' || Number.isNaN(Number(trimmed))) return null;
  const amount = Number(trimmed);
  if (amount < 0) return null;
  return { amountInMinorUnits: Math.round(amount * 100), currency };
}

/** Formats a Money value back into a decimal string for display in a form
 *  input, e.g. { amountInMinorUnits: 2499 } -> "24.99". */
export function formatMoneyInput(money: Money | null | undefined): string {
  if (!money) return '';
  return (money.amountInMinorUnits / 100).toFixed(2);
}

/** Sums a list of Money values. Throws if the list mixes currencies —
 *  the app is single-currency for now (see Money's header comment), so a
 *  currency mismatch here indicates a bug rather than something to
 *  silently coerce. Returns a zero Money in the given currency for an
 *  empty list, so callers don't need a separate empty-cart special case. */
export function sumMoney(amounts: Money[], currency: string = DEFAULT_CURRENCY): Money {
  const total = amounts.reduce((sum, amount) => {
    if (amount.currency !== currency) {
      throw new Error(`Currency mismatch: expected ${currency}, got ${amount.currency}`);
    }
    return sum + amount.amountInMinorUnits;
  }, 0);
  return { amountInMinorUnits: total, currency };
}

/** Formats a Money value as a localized currency string for read-only
 *  display, e.g. "$24.99". */
export function formatMoneyDisplay(money: Money): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: money.currency }).format(
    money.amountInMinorUnits / 100,
  );
}
