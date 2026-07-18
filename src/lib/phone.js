import { parsePhoneNumberFromString } from "libphonenumber-js";

// Dubai gives you the same lead four ways:
//   0501234567 / +971 50 123 4567 / 971501234567 / 00971501234567
// Meta also prepends "p:" to phone numbers (p:+971...). Strip that and
// similar junk before parsing, or every Meta phone fails to normalize.
export function normalizePhone(input, defaultCountry = "AE") {
  if (!input) return null;
  let cleaned = String(input).trim();
  // Strip a leading "p:" that Meta/Facebook lead forms add.
  cleaned = cleaned.replace(/^p:/i, "").trim();
  // 00 international prefix -> +
  cleaned = cleaned.replace(/^00/, "+");
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164, e.g. +971501234567
}

export function formatPhone(e164) {
  if (!e164) return "";
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatInternational() : e164;
}
