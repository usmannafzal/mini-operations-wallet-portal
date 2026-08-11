"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, getTransactions, getWallet } from "@/lib/api";
import type { Transaction, Wallet } from "@/types";
import CreditDebitForm from "@/components/CreditDebitForm";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import TransactionTable from "@/components/TransactionTable";
import WalletCard from "@/components/WalletCard";

export default function WalletDetailPage() {
  const params = useParams<{ id: string }>();
  const walletId = params.id;

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [walletData, txData] = await Promise.all([
        getWallet(walletId),
        getTransactions(walletId),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } catch (err) {
      setWallet(null);
      setTransactions([]);
      setError(
        err instanceof ApiError ? err.message : "Failed to load wallet.",
      );
    } finally {
      setLoading(false);
    }
  }, [walletId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet detail</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Balance, status, credit/debit, and transaction history.
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading wallet…" />}
      {!loading && error && <ErrorMessage message={error} />}

      {!loading && !error && wallet && (
        <>
          <WalletCard wallet={wallet} />

          <CreditDebitForm
            walletId={wallet.id}
            knownReferenceIds={transactions.map((tx) => tx.referenceId)}
            onSuccess={() => {
              void load();
            }}
          />

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Transaction history</h2>
            <TransactionTable transactions={transactions} />
          </section>
        </>
      )}
    </div>
  );
}
