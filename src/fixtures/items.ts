import type { Item } from "../domain/index.js";

export const items: readonly Item[] = [
  { sku: "SNK-BLUE-42", label: "Blue sneaker, size 42", perishable: false },
  { sku: "SNK-BLUE-43", label: "Blue sneaker, size 43", perishable: false },
  { sku: "YOG-NAT-500", label: "Natural yoghurt, 500 g", perishable: true },
  { sku: "CHO-DARK-100", label: "Dark chocolate bar, 100 g", perishable: true },
  { sku: "BOX-CARD-M", label: "Cardboard box, medium", perishable: false },
];
