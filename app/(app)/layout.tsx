import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { requireSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSession();
  return (
    <div className="mx-auto min-h-screen max-w-lg pb-24">
      <header className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          Finance
        </Link>
        <Link href="/pengaturan" aria-label="Pengaturan" className="rounded-full p-2 text-xl text-slate-600">
          ⚙
        </Link>
      </header>
      <main className="px-4">{children}</main>
      <BottomNav />
    </div>
  );
}
