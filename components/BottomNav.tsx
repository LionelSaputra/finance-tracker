"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Beranda" },
  { href: "/transaksi", label: "Transaksi" },
  { href: "/transaksi/baru", label: "+", aria: "Catat transaksi" },
  { href: "/budget", label: "Budget" },
  { href: "/akun", label: "Akun" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg items-center justify-around">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path === it.href || (it.href !== "/transaksi" && path.startsWith(`${it.href}/`));
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                aria-label={it.aria}
                aria-current={active ? "page" : undefined}
                className={
                  it.label === "+"
                    ? "-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-3xl text-white shadow-lg"
                    : `block px-3 py-3 text-sm ${active ? "font-semibold text-teal-700" : "text-slate-500"}`
                }
              >
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
