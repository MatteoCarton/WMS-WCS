import type { LocationCode } from "../domain/location.js";
import { pad } from "../shared/pad.js";

export const BAY_PITCH = 0.6;
export const LEVEL_PITCH = 0.5;
export const AISLE_HALF_WIDTH = 0.7;

export const CARTON_AISLES = 6;
export const CARTON_BAYS = 80;
export const CARTON_LEVELS = 12;

export type AisleSide = "A" | "B";

export interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface RackAddress {
  readonly aisle: number;
  readonly bay: number;
  readonly level: number;
  readonly side: AisleSide;
}

export type Layout = Readonly<Record<LocationCode, Point>>;

const SIDES: readonly AisleSide[] = ["A", "B"];

function metres(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function range(count: number): readonly number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

export function rackCode(address: RackAddress): LocationCode {
  const aisle = `C${pad(address.aisle, 2)}`;
  const bay = pad(address.bay, 3);
  const level = pad(address.level, 2);

  return `${aisle}-${bay}-${level}-${address.side}`;
}

export function rackPoint(address: RackAddress): Point {
  return {
    x: metres((address.bay - 1) * BAY_PITCH),
    y: metres((address.side === "A" ? -1 : 1) * AISLE_HALF_WIDTH),
    z: metres((address.level - 1) * LEVEL_PITCH),
  };
}

export function cartonAddresses(): readonly RackAddress[] {
  return range(CARTON_AISLES).flatMap((aisle) =>
    range(CARTON_BAYS).flatMap((bay) =>
      range(CARTON_LEVELS).flatMap((level) =>
        SIDES.map((side) => ({ aisle, bay, level, side })),
      ),
    ),
  );
}

export function buildLayout(addresses: readonly RackAddress[]): Layout {
  return Object.fromEntries(
    addresses.map((address) => [rackCode(address), rackPoint(address)]),
  );
}

const RACK_CODE = /^C(\d{2})-(\d{3})-(\d{2})-([AB])$/;

export function parseRackCode(code: LocationCode): RackAddress | null {
  const parts = RACK_CODE.exec(code);

  if (parts === null) {
    return null;
  }

  const [, aisle, bay, level, side] = parts;

  return {
    aisle: Number(aisle),
    bay: Number(bay),
    level: Number(level),
    side: side as AisleSide,
  };
}

export const AISLE_HEAD: Point = { x: 0, y: 0, z: 0 };

export function horizontalDistance(from: Point, to: Point): number {
  return metres(Math.abs(to.x - from.x));
}

export function verticalDistance(from: Point, to: Point): number {
  return metres(Math.abs(to.z - from.z));
}
