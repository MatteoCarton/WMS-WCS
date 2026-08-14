export interface Field {
  readonly name: string;
  readonly length: number;
}

export const TERMINATOR = "\r\n";

export const moveFields: readonly Field[] = [
  { name: "type", length: 4 },
  { name: "sequence", length: 8 },
  { name: "taskId", length: 8 },
  { name: "lpn", length: 8 },
  { name: "from", length: 12 },
  { name: "to", length: 12 },
];

export const reportFields: readonly Field[] = [
  { name: "type", length: 4 },
  { name: "sequence", length: 8 },
  { name: "taskId", length: 8 },
  { name: "outcome", length: 4 },
  { name: "equipment", length: 8 },
  { name: "at", length: 12 },
];

export function contentLength(fields: readonly Field[]): number {
  return fields.reduce((total, field) => total + field.length, 0);
}

export function frameLength(fields: readonly Field[]): number {
  return contentLength(fields) + TERMINATOR.length;
}
