type ErrorMessageProps = {
  title?: string;
  message: string;
};

export default function ErrorMessage({
  title = "Something went wrong",
  message,
}: ErrorMessageProps) {
  return (
    <div
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 whitespace-pre-wrap">{message}</p>
    </div>
  );
}
