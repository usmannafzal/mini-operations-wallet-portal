"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError, getDailySummary } from "@/lib/api";
import type { DailySummary } from "@/types";
import EmptyState from "@/components/EmptyState";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [date, setDate] = useState(todayUtc);
  const [appliedDate, setAppliedDate] = useState(todayUtc);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDailySummary(appliedDate);
        if (!cancelled) {
          setSummary(data);
        }
      } catch (err) {
        if (!cancelled) {
          setSummary(null);
          setError(
            err instanceof ApiError
              ? err.message
              : "Failed to load daily summary.",
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
  }, [appliedDate]);

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Date must be YYYY-MM-DD.");
      return;
    }
    setAppliedDate(date);
  }

  const isEmpty = summary != null && summary.transactionCount === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Daily summary
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Computed report for a UTC calendar day (optional date filter).
        </p>
      </div>

      <form
        onSubmit={handleFilter}
        className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 bg-white p-4"
      >
        <div>
          <label htmlFor="date" className="block text-sm font-medium">
            Date (UTC)
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Apply filter
        </button>
      </form>

      {loading && <LoadingSpinner label="Loading report…" />}
      {!loading && error && <ErrorMessage message={error} />}

      {!loading && !error && summary && (
        <>
          {isEmpty ? (
            <EmptyState message={`No transactions on ${summary.date}`} />
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-zinc-200 bg-white p-4">
                <dt className="text-sm text-zinc-500">Date</dt>
                <dd className="mt-1 text-xl font-semibold">{summary.date}</dd>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-4">
                <dt className="text-sm text-zinc-500">Total credits</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {summary.totalCredits}
                </dd>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-4">
                <dt className="text-sm text-zinc-500">Total debits</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {summary.totalDebits}
                </dd>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-4">
                <dt className="text-sm text-zinc-500">Transactions</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {summary.transactionCount}
                </dd>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-4 sm:col-span-2 lg:col-span-4">
                <dt className="text-sm text-zinc-500">Active wallets</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {summary.activeWallets}
                </dd>
              </div>
            </dl>
          )}
        </>
      )}
    </div>
  );
}
