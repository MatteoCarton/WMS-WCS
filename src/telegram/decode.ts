import type { Result } from "../domain/result.js";
import { err, ok } from "../domain/result.js";
import type { Field, TelegramValues } from "./format.js";
import { TERMINATOR, frameLength } from "./format.js";

export type DecodeError =
  | {
      readonly kind: "length";
      readonly expectedLength: number;
      readonly actualLength: number;
    }
  | { readonly kind: "terminator"; readonly frame: string };

function unpad(field: Field, raw: string): string {
  if (field.kind === "text") {
    return raw.trimEnd();
  }

  const digits = raw.replace(/^0+/, "");
  return digits === "" ? "0" : digits;
}

export function decode(
  fields: readonly Field[],
  frame: string,
): Result<TelegramValues, DecodeError> {
  const expectedLength = frameLength(fields);

  if (frame.length !== expectedLength) {
    return err({
      kind: "length",
      expectedLength,
      actualLength: frame.length,
    });
  }

  if (!frame.endsWith(TERMINATOR)) {
    return err({ kind: "terminator", frame });
  }

  const values: Record<string, string> = {};
  let offset = 0;

  for (const field of fields) {
    const raw = frame.slice(offset, offset + field.length);
    values[field.name] = unpad(field, raw);
    offset += field.length;
  }

  return ok(values);
}
