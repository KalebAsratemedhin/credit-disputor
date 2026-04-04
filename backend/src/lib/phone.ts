import type { CountryCode } from "libphonenumber-js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { env } from "../config/env";

/** Parse user input to E.164 using default country for national formats. */
export function toE164(phoneInput: string, defaultCountry?: CountryCode): string | null {
  const region = (defaultCountry ?? env.twilioPhoneDefaultRegion) as CountryCode;
  const parsed = parsePhoneNumberFromString(phoneInput.trim(), region);
  if (!parsed?.isValid()) {
    return null;
  }
  return parsed.number;
}
