import type { Result } from "../domain/result.js";
import { err, ok } from "../domain/result.js";
import type { Field, TelegramValues } from "./format.js";
import { TERMINATOR } from "./format.js";

export type EncodeError =
  | { readonly kind: "missing"; readonly field: string }
  | {
      readonly kind: "overflow";
      readonly field: string;
      readonly value: string;
      readonly maxLength: number;
    };

function fit(field: Field, value: string): Result<string, EncodeError> {
  if (value.length > field.length) {
    return err({
      kind: "overflow",
      field: field.name,
      value,
      maxLength: field.length,
    });
  }

  return ok(
    field.kind === "numeric"
      ? value.padStart(field.length, "0")
      : value.padEnd(field.length, " "),
  );
}

export function encode(
  fields: readonly Field[],
  values: TelegramValues,
): Result<string, EncodeError> {
  const parts: string[] = [];

  for (const field of fields) {
    const value = values[field.name];

    if (value === undefined) {
      return err({ kind: "missing", field: field.name });
    }

    const fitted = fit(field, value);
    if (!fitted.ok) {
      return fitted;
    }

    parts.push(fitted.value);
  }

  return ok(parts.join("") + TERMINATOR);
}
