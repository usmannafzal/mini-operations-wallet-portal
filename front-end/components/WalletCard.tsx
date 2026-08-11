import type { Wallet } from "@/types";

type WalletCardProps = {
  wallet: Wallet;
};

export default function WalletCard({ wallet }: WalletCardProps) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-4">
      <h2 className="text-lg font-medium">Wallet</h2>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">ID</dt>
          <dd className="break-all font-mono text-xs">{wallet.id}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">User ID</dt>
          <dd className="break-all font-mono text-xs">{wallet.userId}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Balance</dt>
          <dd className="text-xl font-semibold">
            {wallet.balance} {wallet.currency}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Status</dt>
          <dd className="capitalize">{wallet.status}</dd>
        </div>
      </dl>
    </section>
  );
}
