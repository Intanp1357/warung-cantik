export type Role = "owner" | "cashier";

export type PaymentMethod = "cash" | "qris" | "transfer";

export type TransactionStatus = "completed" | "refunded";

/**
 * Fulfilment state of a checked-out item in the product queue.
 * - `pending`: not served yet
 * - `done`: already served
 * - `cancelled`: not served on purpose (stock returns to the product)
 */
export type QueueStatus = "pending" | "done" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  /** Products in this category are offered as toppings for other products. */
  is_topping: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price: number;
  cost_price: number;
  /** `null` means stock tracking is disabled for this product. */
  stock: number | null;
  image_url: string | null;
  is_available: boolean;
  /** When true the cashier can add toppings to this product at the POS. */
  has_toppings: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithCategory extends Product {
  category: Pick<Category, "id" | "name" | "is_topping"> | null;
}

export interface Transaction {
  id: string;
  transaction_code: string;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_amount: number;
  change_amount: number;
  status: TransactionStatus;
  created_at: string;
  created_by: string | null;
  created_by_name?: string | null;
  items?: TransactionItem[];
  item_count?: number;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  created_at: string;
  queue_status: QueueStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  /** Toppings booked on this line (only fetched where they are rendered). */
  toppings?: TransactionItemTopping[];
}

/** A topping recorded on a transaction line (name/price are snapshots). */
export interface TransactionItemTopping {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
}

export interface QueueTransaction {
  id: string;
  transaction_code: string;
  payment_method: PaymentMethod;
  total_amount: number;
  created_at: string;
  cashier_name: string | null;
}

export interface QueueItem extends TransactionItem {
  transaction: QueueTransaction;
}

/** All queue items of one checkout, oldest order first. */
export interface QueueGroup {
  transaction: QueueTransaction;
  items: QueueItem[];
}

export interface ShopSettings {
  id: number;
  shop_name: string;
  address: string;
  phone: string;
  receipt_footer: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface SessionContext {
  user: AuthUser;
  profile: Profile;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
