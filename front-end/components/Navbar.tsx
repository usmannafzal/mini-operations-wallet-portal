import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/users", label: "Users" },
  { href: "/reports", label: "Reports" },
] as const;

export default function Navbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/dashboard" className="font-semibold text-zinc-900">
          Wallet Portal
        </Link>
        <ul className="flex gap-4 text-sm text-zinc-600">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-zinc-900">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
