import type { PickStrategy } from "./domain/index.js";
import {
  allocate,
  availableStock,
  physicalStock,
  pickCandidates,
  reservedStock,
} from "./domain/index.js";
import { containers } from "./fixtures/index.js";

function reportStock(sku: string): void {
  const physical = physicalStock(containers, sku);
  const reserved = reservedStock(containers, sku);
  const available = availableStock(containers, sku);

  console.log(`${sku}`);
  console.log(`  physical   ${physical}`);
  console.log(`  reserved   ${reserved}`);
  console.log(`  available  ${available}  (physical minus reserved and untouchable)`);
  console.log("");
}

function reportStrategy(sku: string, strategy: PickStrategy): void {
  console.log(`${sku}  ${strategy.toUpperCase()}`);

  for (const candidate of pickCandidates(containers, sku, strategy)) {
    const expiry = candidate.expiryDate?.toISOString().slice(0, 10) ?? "never";
    const received = candidate.receivedAt.toISOString().slice(0, 10);
    console.log(
      `  ${candidate.lpn}  qty ${String(candidate.availableQuantity).padStart(3)}` +
        `  received ${received}  expires ${expiry}`,
    );
  }
  console.log("");
}

reportStock("SNK-BLUE-42");
reportStock("YOG-NAT-500");

reportStrategy("YOG-NAT-500", "fifo");
reportStrategy("YOG-NAT-500", "fefo");

const order = allocate(containers, "YOG-NAT-500", 150, "fefo");
console.log("allocate 150 YOG-NAT-500 with FEFO");
for (const pick of order.picks) {
  console.log(`  take ${pick.quantity} from ${pick.lpn}`);
}
console.log(`  shortfall ${order.shortfall}`);
