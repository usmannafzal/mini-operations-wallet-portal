type LoadingSpinnerProps = {
  label?: string;
};

export default function LoadingSpinner({
  label = "Loading…",
}: LoadingSpinnerProps) {
  return (
    <div
      className="flex items-center gap-3 py-8 text-sm text-zinc-600"
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
