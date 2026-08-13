export type EventId = string;

export type EntityKind = "item" | "location" | "container" | "order" | "task";

export type EventSource = "wms" | "wcs" | "operator" | "erp";

export interface DomainEvent {
  readonly id: EventId;
  readonly occurredAt: Date;
  readonly type: string;
  readonly entityKind: EntityKind;
  readonly entityId: string;
  readonly source: EventSource;
  readonly details: Readonly<Record<string, unknown>>;
}
