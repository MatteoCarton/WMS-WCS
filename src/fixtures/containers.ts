import type { Container } from "../domain/index.js";

export const containers: readonly Container[] = [
  {
    lpn: "BIN00101",
    state: "in_stock",
    locationCode: "A12-045-01-A",
    contents: [
      {
        sku: "SNK-BLUE-42",
        quantity: 40,
        reservedQuantity: 12,
        receivedAt: new Date("2026-06-02"),
        expiryDate: null,
      },
    ],
  },
  {
    lpn: "BIN00102",
    state: "in_stock",
    locationCode: "A12-045-02-A",
    contents: [
      {
        sku: "SNK-BLUE-42",
        quantity: 60,
        reservedQuantity: 0,
        receivedAt: new Date("2026-07-18"),
        expiryDate: null,
      },
    ],
  },
  {
    lpn: "BIN00103",
    state: "in_stock",
    locationCode: "A12-045-03-B",
    contents: [
      {
        sku: "SNK-BLUE-43",
        quantity: 25,
        reservedQuantity: 5,
        receivedAt: new Date("2026-06-02"),
        expiryDate: null,
      },
    ],
  },
  {
    lpn: "BIN00104",
    state: "in_stock",
    locationCode: "A12-046-01-A",
    contents: [
      {
        sku: "YOG-NAT-500",
        quantity: 120,
        reservedQuantity: 0,
        receivedAt: new Date("2026-08-01"),
        expiryDate: new Date("2026-08-28"),
      },
    ],
  },
  {
    lpn: "BIN00105",
    state: "in_stock",
    locationCode: "A12-046-02-A",
    contents: [
      {
        sku: "YOG-NAT-500",
        quantity: 80,
        reservedQuantity: 20,
        receivedAt: new Date("2026-07-20"),
        expiryDate: new Date("2026-09-11"),
      },
    ],
  },
  {
    lpn: "BIN00106",
    state: "in_stock",
    locationCode: "A12-047-01-A",
    contents: [
      {
        sku: "CHO-DARK-100",
        quantity: 200,
        reservedQuantity: 0,
        receivedAt: new Date("2026-05-14"),
        expiryDate: new Date("2027-03-31"),
      },
    ],
  },
  {
    lpn: "BIN00107",
    state: "in_stock",
    locationCode: "A13-045-01-A",
    contents: [
      {
        sku: "BOX-CARD-M",
        quantity: 500,
        reservedQuantity: 0,
        receivedAt: new Date("2026-04-09"),
        expiryDate: null,
      },
    ],
  },
  {
    lpn: "BIN00108",
    state: "in_stock",
    locationCode: "A13-045-02-A",
    contents: [
      {
        sku: "SNK-BLUE-42",
        quantity: 15,
        reservedQuantity: 0,
        receivedAt: new Date("2026-05-05"),
        expiryDate: null,
      },
      {
        sku: "SNK-BLUE-43",
        quantity: 10,
        reservedQuantity: 0,
        receivedAt: new Date("2026-05-05"),
        expiryDate: null,
      },
    ],
  },
  {
    lpn: "BIN00109",
    state: "reserved",
    locationCode: "P01-001-01-A",
    contents: [
      {
        sku: "SNK-BLUE-42",
        quantity: 18,
        reservedQuantity: 18,
        receivedAt: new Date("2026-07-30"),
        expiryDate: null,
      },
    ],
  },
  {
    lpn: "BIN00110",
    state: "in_stock",
    locationCode: "P01-002-01-A",
    contents: [
      {
        sku: "YOG-NAT-500",
        quantity: 24,
        reservedQuantity: 6,
        receivedAt: new Date("2026-08-10"),
        expiryDate: new Date("2026-08-20"),
      },
    ],
  },
  {
    lpn: "BIN00111",
    state: "moving",
    locationCode: null,
    contents: [
      {
        sku: "CHO-DARK-100",
        quantity: 48,
        reservedQuantity: 48,
        receivedAt: new Date("2026-05-14"),
        expiryDate: new Date("2027-03-31"),
      },
    ],
  },
  {
    lpn: "BIN00112",
    state: "at_station",
    locationCode: null,
    contents: [
      {
        sku: "SNK-BLUE-43",
        quantity: 6,
        reservedQuantity: 6,
        receivedAt: new Date("2026-06-02"),
        expiryDate: null,
      },
    ],
  },
  {
    lpn: "BIN00113",
    state: "blocked",
    locationCode: "A13-046-01-A",
    contents: [
      {
        sku: "YOG-NAT-500",
        quantity: 30,
        reservedQuantity: 0,
        receivedAt: new Date("2026-07-05"),
        expiryDate: new Date("2026-08-02"),
      },
    ],
  },
  {
    lpn: "BIN00114",
    state: "in_stock",
    locationCode: "A13-046-02-B",
    contents: [],
  },
  {
    lpn: "BIN00115",
    state: "in_stock",
    locationCode: "P01-003-01-A",
    contents: [],
  },
];
