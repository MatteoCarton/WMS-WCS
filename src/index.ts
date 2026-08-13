import type { Container, Item, Order } from "./domain/index.js";

const item: Item = {
  sku: "SNK-BLUE-42",
  label: "Blue sneaker, size 42",
  perishable: false,
};

const container: Container = {
  lpn: "BIN00123",
  state: "in_stock",
  locationCode: "A12-045-03-B",
  contents: [
    { sku: item.sku, quantity: 50, reservedQuantity: 12, expiryDate: null },
  ],
};

const order: Order = {
  reference: "ORD-2026-0001",
  customer: "Delhaize Mouscron",
  createdAt: new Date("2026-08-13T09:00:00Z"),
  state: "received",
  lines: [{ sku: item.sku, requestedQuantity: 10, pickedQuantity: 0 }],
};

console.log(`Item      ${item.sku} — ${item.label}`);
console.log(
  `Container ${container.lpn} @ ${container.locationCode ?? "in motion"} — ${container.state}`,
);
console.log(`Order     ${order.reference} — ${order.customer} — ${order.state}`);
