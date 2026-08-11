"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ApiError,
  createUser,
  createWallet,
  getUsers,
} from "@/lib/api";
import type { Currency, User, Wallet } from "@/types";
import EmptyState from "@/components/EmptyState";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "JPY", "KRW", "CNY"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [walletUserId, setWalletUserId] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [createdWallet, setCreatedWallet] = useState<Wallet | null>(null);
  const [creatingWallet, setCreatingWallet] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setListError(null);
    try {
      const data = await getUsers();
      setUsers(data);
      if (!walletUserId && data.length > 0) {
        setWalletUserId(data[0].id);
      }
    } catch (err) {
      setListError(
        err instanceof ApiError ? err.message : "Failed to load users.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim() || !phone.trim() || !email.trim()) {
      setFormError("Name, phone, and email are required.");
      return;
    }

    setCreating(true);
    try {
      const user = await createUser({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      setFormSuccess(`Created user ${user.name} (${user.id}).`);
      setName("");
      setPhone("");
      setEmail("");
      await loadUsers();
      setWalletUserId(user.id);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Failed to create user.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWalletError(null);
    setCreatedWallet(null);

    if (!walletUserId) {
      setWalletError("Select a user first.");
      return;
    }

    setCreatingWallet(true);
    try {
      const wallet = await createWallet({ userId: walletUserId, currency });
      setCreatedWallet(wallet);
    } catch (err) {
      setWalletError(
        err instanceof ApiError ? err.message : "Failed to create wallet.",
      );
    } finally {
      setCreatingWallet(false);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Create users and wallets, then open a wallet to move money.
        </p>
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <form
          onSubmit={handleCreateUser}
          className="space-y-4 rounded-md border border-zinc-200 bg-white p-4"
          noValidate
        >
          <h2 className="text-lg font-medium">Create user</h2>
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium">
              Phone
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          {formError && <ErrorMessage message={formError} />}
          {formSuccess && (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {formSuccess}
            </p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create user"}
          </button>
        </form>

        <form
          onSubmit={handleCreateWallet}
          className="space-y-4 rounded-md border border-zinc-200 bg-white p-4"
          noValidate
        >
          <h2 className="text-lg font-medium">Create wallet</h2>
          <p className="text-sm text-zinc-600">
            Needed for the manual test flow (no separate wallets list page).
          </p>
          <div>
            <label htmlFor="walletUserId" className="block text-sm font-medium">
              User
            </label>
            <select
              id="walletUserId"
              value={walletUserId}
              onChange={(e) => setWalletUserId(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              disabled={users.length === 0}
            >
              {users.length === 0 ? (
                <option value="">No users yet</option>
              ) : (
                users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {walletError && <ErrorMessage message={walletError} />}
          {createdWallet && (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Wallet created.{" "}
              <Link
                href={`/wallets/${createdWallet.id}`}
                className="font-medium underline"
              >
                Open wallet {createdWallet.id}
              </Link>
            </p>
          )}
          <button
            type="submit"
            disabled={creatingWallet || users.length === 0}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {creatingWallet ? "Creating…" : "Create wallet"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium">Existing users</h2>
        {loading && <LoadingSpinner label="Loading users…" />}
        {!loading && listError && <ErrorMessage message={listError} />}
        {!loading && !listError && users.length === 0 && (
          <EmptyState message="No users yet" />
        )}
        {!loading && !listError && users.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-md border border-zinc-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">ID</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-3 py-2">{user.name}</td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2">{user.phone}</td>
                    <td className="px-3 py-2 capitalize">{user.status}</td>
                    <td className="px-3 py-2 font-mono text-xs">{user.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
