import type { ZodError } from "zod";
import { VALIDATION_MESSAGE_MAX_FIELD_NAMES } from "../constants";

function uniqueTopLevelFieldNames(err: ZodError): string[] {
  const names = new Set<string>();
  for (const issue of err.errors) {
    const key = issue.path[0];
    if (typeof key === "string" && key.length > 0) {
      names.add(key);
    } else if (issue.path.length === 0) {
      names.add("(request)");
    }
  }
  return [...names];
}

function joinFieldNames(names: string[]): string {
  if (names.length === 0) {
    return "Request";
  }
  if (names.length === 1) {
    return names[0]!;
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  const head = names.slice(0, -1).join(", ");
  const tail = names[names.length - 1]!;
  return `${head}, and ${tail}`;
}

export function formatValidationMessage(err: ZodError): string {
  const names = uniqueTopLevelFieldNames(err);
  if (names.length === 0) {
    return "Some fields are missing or invalid.";
  }
  if (names.length <= VALIDATION_MESSAGE_MAX_FIELD_NAMES) {
    return `${joinFieldNames(names)} ${names.length === 1 ? "is" : "are"} missing or invalid.`;
  }
  const shown = names.slice(0, VALIDATION_MESSAGE_MAX_FIELD_NAMES);
  const rest = names.length - VALIDATION_MESSAGE_MAX_FIELD_NAMES;
  return `${joinFieldNames(shown)}, and ${rest} other field${rest === 1 ? "" : "s"} are missing or invalid.`;
}
