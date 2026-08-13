export type Sku = string;

export interface Item {
  readonly sku: Sku;
  readonly label: string;
  readonly perishable: boolean;
}
