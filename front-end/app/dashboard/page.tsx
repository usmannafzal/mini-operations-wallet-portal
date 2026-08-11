"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, getDailySummary } from "@/lib/api";
import type { DailySummary } from "@/types";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletId, setWalletId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDailySummary(todayUtc());
        if (!cancelled) {
          setSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load dashboard summary.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOpenWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = walletId.trim();
    if (id) {
      router.push(`/wallets/${id}`);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Today&apos;s stats from{" "}
          <code className="text-xs">GET /reports/daily-summary</code>. There is
          no wallet-list or global-balance endpoint, so totals below are for the
          UTC day (not lifetime portfolio totals).
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading summary…" />}
      {!loading && error && <ErrorMessage message={error} />}

      {!loading && !error && summary && (
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Active wallets (today)"
            value={String(summary.activeWallets)}
            hint="Distinct wallets with a transaction today"
          />
          <Stat label="Total credits" value={summary.totalCredits} />
          <Stat label="Total debits" value={summary.totalDebits} />
          <Stat
            label="Transaction count"
            value={String(summary.transactionCount)}
          />
        </dl>
      )}

      <form
        onSubmit={handleOpenWallet}
        className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-white p-4"
      >
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="walletId" className="block text-sm font-medium">
            Open wallet by ID
          </label>
          <input
            id="walletId"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Wallet UUID"
          />
        </div>
        <button
          type="submit"
          disabled={!walletId.trim()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Open
        </button>
      </form>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
