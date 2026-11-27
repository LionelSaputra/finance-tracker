"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Beranda", icon: "home" },
  { href: "/transaksi", label: "Transaksi", icon: "list" },
  { href: "/transaksi/baru", label: "Catat", icon: "plus" },
  { href: "/budget", label: "Budget", icon: "budget" },
  { href: "/akun", label: "Akun", icon: "wallet" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto grid h-[68px] max-w-5xl grid-cols-5 items-center">
        {items.map((it) => {
          const plus = it.href === "/transaksi/baru";
          const active = it.href === "/" ? path === "/" : path === it.href || (!plus && it.href !== "/transaksi" && path.startsWith(`${it.href}/`));
          return (
            <li key={it.href} className="flex justify-center">
              {plus ? (
                <Link href={it.href} aria-label="Catat transaksi" className="grid h-13 w-13 place-items-center rounded-full bg-ink text-paper transition-transform active:scale-95">
                  <Icon name="plus" size={26} />
                </Link>
              ) : (
                <Link
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-w-16 flex-col items-center gap-0.5 py-1.5 text-[11px] ${active ? "font-semibold text-ink" : "text-ink-3"}`}
                >
                  <Icon name={it.icon} size={22} />
                  {it.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** At laptop width the same destinations sit in the header rail, with Catat as the one filled button. */
export function TopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
      {items
        .filter((it) => it.href !== "/transaksi/baru")
        .map((it) => {
          const active = it.href === "/" ? path === "/" : path === it.href || (it.href !== "/transaksi" && path.startsWith(`${it.href}/`));
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm ${active ? "font-semibold text-ink underline decoration-2 underline-offset-[6px]" : "text-ink-2 hover:text-ink"}`}
            >
              {it.label}
            </Link>
          );
        })}
      <Link href="/transaksi/baru" className="ml-2 inline-flex h-10 items-center gap-1.5 rounded-md bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink-2">
        <Icon name="plus" size={18} /> Catat
      </Link>
    </nav>
  );
}
