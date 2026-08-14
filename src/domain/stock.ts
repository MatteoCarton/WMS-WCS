import type {
  Container,
  ContainerState,
  Lpn,
  StockLine,
} from "./container.js";
import type { Sku } from "./item.js";
import type { LocationCode } from "./location.js";

export type PickStrategy = "fifo" | "fefo";

export interface PickCandidate {
  readonly lpn: Lpn;
  readonly locationCode: LocationCode | null;
  readonly sku: Sku;
  readonly availableQuantity: number;
  readonly receivedAt: Date;
  readonly expiryDate: Date | null;
}

export interface AllocationPick {
  readonly lpn: Lpn;
  readonly quantity: number;
}

export interface Allocation {
  readonly picks: readonly AllocationPick[];
  readonly shortfall: number;
}

const pickableStates: readonly ContainerState[] = ["in_stock", "reserved"];

function isPickable(container: Container): boolean {
  return pickableStates.includes(container.state);
}

function linesFor(container: Container, sku: Sku): readonly StockLine[] {
  return container.contents.filter((line) => line.sku === sku);
}

function toCandidate(container: Container, line: StockLine): PickCandidate {
  return {
    lpn: container.lpn,
    locationCode: container.locationCode,
    sku: line.sku,
    availableQuantity: line.quantity - line.reservedQuantity,
    receivedAt: line.receivedAt,
    expiryDate: line.expiryDate,
  };
}

function byAge(a: PickCandidate, b: PickCandidate): number {
  return a.receivedAt.getTime() - b.receivedAt.getTime();
}

function byExpiry(a: PickCandidate, b: PickCandidate): number {
  if (a.expiryDate === null && b.expiryDate === null) return byAge(a, b);
  if (a.expiryDate === null) return 1;
  if (b.expiryDate === null) return -1;
  return a.expiryDate.getTime() - b.expiryDate.getTime();
}

export function physicalStock(
  containers: readonly Container[],
  sku: Sku,
): number {
  return containers
    .flatMap((container) => linesFor(container, sku))
    .reduce((total, line) => total + line.quantity, 0);
}

export function reservedStock(
  containers: readonly Container[],
  sku: Sku,
): number {
  return containers
    .flatMap((container) => linesFor(container, sku))
    .reduce((total, line) => total + line.reservedQuantity, 0);
}

export function availableStock(
  containers: readonly Container[],
  sku: Sku,
): number {
  return containers
    .filter(isPickable)
    .flatMap((container) => linesFor(container, sku))
    .reduce(
      (total, line) => total + line.quantity - line.reservedQuantity,
      0,
    );
}

export function pickCandidates(
  containers: readonly Container[],
  sku: Sku,
  strategy: PickStrategy,
): readonly PickCandidate[] {
  const candidates = containers
    .filter(isPickable)
    .flatMap((container) =>
      linesFor(container, sku).map((line) => toCandidate(container, line)),
    )
    .filter((candidate) => candidate.availableQuantity > 0);

  return [...candidates].sort(strategy === "fifo" ? byAge : byExpiry);
}

export function allocate(
  containers: readonly Container[],
  sku: Sku,
  quantity: number,
  strategy: PickStrategy,
): Allocation {
  const picks: AllocationPick[] = [];
  let remaining = quantity;

  for (const candidate of pickCandidates(containers, sku, strategy)) {
    if (remaining === 0) break;
    const taken = Math.min(remaining, candidate.availableQuantity);
    picks.push({ lpn: candidate.lpn, quantity: taken });
    remaining -= taken;
  }

  return { picks, shortfall: remaining };
}
