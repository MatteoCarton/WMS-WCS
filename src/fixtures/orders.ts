import type { Order } from "../domain/index.js";

export const orders: readonly Order[] = [
  {
    reference: "ORD-2026-0001",
    customer: "Delhaize Mouscron",
    createdAt: new Date("2026-08-13T08:12:00Z"),
    state: "planned",
    lines: [
      { sku: "SNK-BLUE-42", requestedQuantity: 30, pickedQuantity: 0 },
      { sku: "SNK-BLUE-43", requestedQuantity: 6, pickedQuantity: 0 },
    ],
  },
  {
    reference: "ORD-2026-0002",
    customer: "Colruyt Tournai",
    createdAt: new Date("2026-08-13T09:45:00Z"),
    state: "picking",
    lines: [
      { sku: "YOG-NAT-500", requestedQuantity: 26, pickedQuantity: 20 },
      { sku: "CHO-DARK-100", requestedQuantity: 48, pickedQuantity: 48 },
    ],
  },
  {
    reference: "ORD-2026-0003",
    customer: "Carrefour Comines",
    createdAt: new Date("2026-08-13T11:03:00Z"),
    state: "received",
    lines: [{ sku: "BOX-CARD-M", requestedQuantity: 120, pickedQuantity: 0 }],
  },
];
