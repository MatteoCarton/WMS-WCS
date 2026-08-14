export type FieldKind = "text" | "numeric";

export interface Field {
  readonly name: string;
  readonly length: number;
  readonly kind: FieldKind;
}

export type TelegramValues = Readonly<Record<string, string>>;

export const TERMINATOR = "\r\n";

export const moveFields: readonly Field[] = [
  { name: "type", length: 4, kind: "text" },
  { name: "sequence", length: 8, kind: "numeric" },
  { name: "taskId", length: 8, kind: "text" },
  { name: "lpn", length: 8, kind: "text" },
  { name: "from", length: 12, kind: "text" },
  { name: "to", length: 12, kind: "text" },
];

export const reportFields: readonly Field[] = [
  { name: "type", length: 4, kind: "text" },
  { name: "sequence", length: 8, kind: "numeric" },
  { name: "taskId", length: 8, kind: "text" },
  { name: "outcome", length: 4, kind: "text" },
  { name: "equipment", length: 8, kind: "text" },
  { name: "at", length: 12, kind: "numeric" },
];

export function contentLength(fields: readonly Field[]): number {
  return fields.reduce((total, field) => total + field.length, 0);
}

export function frameLength(fields: readonly Field[]): number {
  return contentLength(fields) + TERMINATOR.length;
}
