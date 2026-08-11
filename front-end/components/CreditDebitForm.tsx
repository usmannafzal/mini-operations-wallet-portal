"use client";

import { FormEvent, useState } from "react";
import { ApiError, creditWallet, debitWallet } from "@/lib/api";
import type { CreateTransactionInput, Transaction } from "@/types";
import ErrorMessage from "@/components/ErrorMessage";

type CreditDebitFormProps = {
  walletId: string;
  onSuccess: (tx: Transaction, meta: { replayed: boolean }) => void;
};

type FormErrors = {
  amount?: string;
  referenceId?: string;
};

function validate(input: CreateTransactionInput): FormErrors {
  const errors: FormErrors = {};

  if (!input.amount.trim()) {
    errors.amount = "Amount is required.";
  } else if (!/^\d+(\.\d{1,4})?$/.test(input.amount.trim())) {
    errors.amount = "Use a positive decimal with up to 4 decimal places.";
  } else if (Number(input.amount) <= 0) {
    errors.amount = "Amount must be greater than 0.";
  }

  if (!input.referenceId.trim()) {
    errors.referenceId = "Reference ID is required.";
  }

  return errors;
}

export default function CreditDebitForm({
  walletId,
  onSuccess,
}: CreditDebitFormProps) {
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const input: CreateTransactionInput = {
      amount: amount.trim(),
      referenceId: referenceId.trim(),
      description: description.trim() || undefined,
    };

    const errors = validate(input);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const { transaction: tx, replayed } =
        type === "credit"
          ? await creditWallet(walletId, input)
          : await debitWallet(walletId, input);

      // The backend is idempotent and tells us authoritatively whether this was a
      // replay (HTTP 200) or a newly applied transaction (HTTP 201). On replay the
      // balance was NOT changed, so surface that clearly instead of a success.
      if (replayed) {
        setSubmitError(
          `Duplicate referenceId "${input.referenceId}". The original transaction was returned; the balance was not applied again.`,
        );
        onSuccess(tx, { replayed: true });
        return;
      }

      setSuccessMessage(
        `${type === "credit" ? "Credited" : "Debited"} ${tx.amount} successfully.`,
      );
      onSuccess(tx, { replayed: false });
      setAmount("");
      setReferenceId("");
      setDescription("");
      setFieldErrors({});
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Request failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-md border border-zinc-200 bg-white p-4"
      noValidate
    >
      <h2 className="text-lg font-medium">Credit / Debit</h2>

      <fieldset className="flex gap-4 text-sm">
        <legend className="sr-only">Transaction type</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="type"
            value="credit"
            checked={type === "credit"}
            onChange={() => setType("credit")}
          />
          Credit
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="type"
            value="debit"
            checked={type === "debit"}
            onChange={() => setType("debit")}
          />
          Debit
        </label>
      </fieldset>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium">
          Amount
        </label>
        <input
          id="amount"
          name="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          placeholder="100.50"
          inputMode="decimal"
        />
        {fieldErrors.amount && (
          <p className="mt-1 text-sm text-red-700">{fieldErrors.amount}</p>
        )}
      </div>

      <div>
        <label htmlFor="referenceId" className="block text-sm font-medium">
          Reference ID
        </label>
        <input
          id="referenceId"
          name="referenceId"
          value={referenceId}
          onChange={(e) => setReferenceId(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          placeholder="order-12345-topup"
        />
        {fieldErrors.referenceId && (
          <p className="mt-1 text-sm text-red-700">{fieldErrors.referenceId}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description (optional)
        </label>
        <input
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {submitError && (
        <ErrorMessage
          title={
            submitError.startsWith("Duplicate referenceId")
              ? "Duplicate referenceId"
              : "Request failed"
          }
          message={submitError}
        />
      )}
      {successMessage && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting
          ? "Submitting…"
          : type === "credit"
            ? "Credit wallet"
            : "Debit wallet"}
      </button>
    </form>
  );
}
