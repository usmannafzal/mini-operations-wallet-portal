/**
 * Frontend types mirrored from the NestJS backend entities/DTOs.
 *
 * Money fields are `string` because Postgres `numeric` is returned as a string
 * (avoids JS floating-point precision issues). Dates are `string` because JSON
 * serializes Date values to ISO timestamps.
 */

export type UserStatus = "active" | "inactive";

export type WalletStatus = "active" | "inactive";

export type Currency = "USD" | "EUR" | "GBP" | "JPY" | "KRW" | "CNY";

export type TransactionType = "credit" | "debit";

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  currency: Currency;
  /** Decimal string, e.g. "100.5000" — not a JS number. */
  balance: string;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  /** Decimal string, e.g. "25.0000" */
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  /** Caller-supplied idempotency key (unique). */
  referenceId: string;
  description: string | null;
  createdAt: string;
}

/** Computed report — not a DB table. From GET /reports/daily-summary. */
export interface DailySummary {
  /** UTC calendar day, YYYY-MM-DD */
  date: string;
  totalCredits: string;
  totalDebits: string;
  transactionCount: number;
  /** Distinct wallets that had a transaction that day */
  activeWallets: number;
}

/** POST /users body */
export interface CreateUserInput {
  name: string;
  phone: string;
  email: string;
}

/** POST /wallets body */
export interface CreateWalletInput {
  userId: string;
  currency: Currency;
}

/** POST /wallets/:id/credit and /debit body */
export interface CreateTransactionInput {
  /** Positive decimal string, up to 4 dp (e.g. "100.50") */
  amount: string;
  referenceId: string;
  description?: string;
}
