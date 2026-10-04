import type { PaymentMethod, Role } from "@/types";

export const APP_NAME = "Warung Cantik";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "qris", label: "QRIS" },
  { value: "transfer", label: "Transfer" },
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  qris: "QRIS",
  transfer: "Transfer",
};

export type DateRangeKey = "today" | "week" | "month";

export const DATE_RANGES: { value: DateRangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  cashier: "Cashier",
};

export const CASH_PRESETS = [10_000, 20_000, 50_000, 100_000];

export const PRODUCT_IMAGE_BUCKET = "product-images";

export const DEFAULT_PAGE_SIZE = 12;
