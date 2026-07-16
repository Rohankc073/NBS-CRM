import { parsePhoneNumberFromString } from "libphonenumber-js";

// Dubai gives you the same lead four ways:
//   0501234567 / +971 50 123 4567 / 971501234567 / 00971501234567
// All must collapse to ONE string, or duplicate detection is theatre.
// Default region AE (UAE), since that's where the leads come from.
export function normalizePhone(input, defaultCountry = "AE") {
  if (!input) return null;
  const cleaned = String(input).trim().replace(/^00/, "+");
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164, e.g. +971501234567
}

// For display: +971 50 123 4567
export function formatPhone(e164) {
  if (!e164) return "";
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}
