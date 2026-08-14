import type { Location, LocationZone } from "../domain/index.js";

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function location(
  zone: LocationZone,
  aisle: string,
  bay: number,
  level: number,
  slot: string,
): Location {
  return {
    code: `${aisle}-${pad(bay, 3)}-${pad(level, 2)}-${slot}`,
    zone,
    aisle,
    bay,
    level,
    slot,
  };
}

export const locations: readonly Location[] = [
  location("receiving", "RCV", 1, 1, "A"),
  location("receiving", "RCV", 2, 1, "A"),

  location("bulk", "A12", 45, 1, "A"),
  location("bulk", "A12", 45, 2, "A"),
  location("bulk", "A12", 45, 3, "B"),
  location("bulk", "A12", 46, 1, "A"),
  location("bulk", "A12", 46, 2, "A"),
  location("bulk", "A12", 47, 1, "A"),
  location("bulk", "A13", 45, 1, "A"),
  location("bulk", "A13", 45, 2, "A"),
  location("bulk", "A13", 46, 1, "A"),
  location("bulk", "A13", 46, 2, "B"),

  location("picking", "P01", 1, 1, "A"),
  location("picking", "P01", 2, 1, "A"),
  location("picking", "P01", 3, 1, "A"),
  location("picking", "P01", 4, 1, "A"),
  location("picking", "P01", 5, 1, "A"),

  location("packing", "PCK", 1, 1, "A"),
  location("packing", "PCK", 2, 1, "A"),

  location("shipping", "SHP", 1, 1, "A"),
];
