import type {
  CreateTransactionInput,
  CreateUserInput,
  CreateWalletInput,
  DailySummary,
  Transaction,
  User,
  Wallet,
} from "@/types";

/**
 * Thin fetch wrappers around the NestJS backend.
 * Not an abstraction layer — just typed helpers so pages don't repeat URL/JSON boilerplate.
 */

function getBaseUrl(): string {
  // Relative (`/backend`) or absolute. Relative is preferred in Docker so the
  // browser hits the Next service, which proxies to Nest over the compose network.
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local.",
    );
  }
  return baseUrl.replace(/\/$/, "");
}

/** Normalized API failure so UI can show message / error code (e.g. INSUFFICIENT_BALANCE). */
export class ApiError extends Error {
  status: number;
  errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

type NestErrorBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

async function requestWithResponse<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; response: Response }> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let errorCode: string | undefined;

    try {
      const body = (await response.json()) as NestErrorBody;
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (typeof body.message === "string" && body.message.length > 0) {
        message = body.message;
      }
      // Nest often puts a short label in `error` (e.g. "Bad Request").
      // Our wallet service uses a custom code there for insufficient funds.
      if (typeof body.error === "string" && body.error.length > 0) {
        errorCode = body.error;
      }
    } catch {
      // Non-JSON error body — keep the generic message.
    }

    throw new ApiError(response.status, message, errorCode);
  }

  // 204 / empty body safety (none of our endpoints use it today, but keep parse safe).
  if (response.status === 204) {
    return { data: undefined as T, response };
  }

  return { data: (await response.json()) as T, response };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await requestWithResponse<T>(path, init);
  return data;
}

export function getUsers(): Promise<User[]> {
  return request<User[]>("/users");
}

export function createUser(input: CreateUserInput): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createWallet(input: CreateWalletInput): Promise<Wallet> {
  return request<Wallet>("/wallets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getWallet(id: string): Promise<Wallet> {
  return request<Wallet>(`/wallets/${id}`);
}

export function getTransactions(walletId: string): Promise<Transaction[]> {
  return request<Transaction[]>(`/wallets/${walletId}/transactions`);
}

/**
 * Result of a credit/debit. `replayed` is the authoritative idempotency signal from the
 * backend: the API returns HTTP 201 for a newly applied transaction and HTTP 200 when the
 * referenceId was already used (the original transaction is returned, balance unchanged).
 */
export interface TransactionResult {
  transaction: Transaction;
  replayed: boolean;
}

export async function creditWallet(
  walletId: string,
  input: CreateTransactionInput,
): Promise<TransactionResult> {
  const { data, response } = await requestWithResponse<Transaction>(
    `/wallets/${walletId}/credit`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return { transaction: data, replayed: response.status === 200 };
}

export async function debitWallet(
  walletId: string,
  input: CreateTransactionInput,
): Promise<TransactionResult> {
  const { data, response } = await requestWithResponse<Transaction>(
    `/wallets/${walletId}/debit`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return { transaction: data, replayed: response.status === 200 };
}

export function getDailySummary(date?: string): Promise<DailySummary> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<DailySummary>(`/reports/daily-summary${query}`);
}
