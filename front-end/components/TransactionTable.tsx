import type { Transaction } from "@/types";
import EmptyState from "@/components/EmptyState";

type TransactionTableProps = {
  transactions: Transaction[];
};

export default function TransactionTable({
  transactions,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return <EmptyState message="No transactions yet" />;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Before</th>
            <th className="px-3 py-2 font-medium">After</th>
            <th className="px-3 py-2 font-medium">Reference</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-3 py-2 capitalize">{tx.type}</td>
              <td className="px-3 py-2 font-mono">{tx.amount}</td>
              <td className="px-3 py-2 font-mono">{tx.balanceBefore}</td>
              <td className="px-3 py-2 font-mono">{tx.balanceAfter}</td>
              <td className="px-3 py-2 font-mono text-xs">{tx.referenceId}</td>
              <td className="px-3 py-2">{tx.description ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap text-zinc-600">
                {new Date(tx.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
