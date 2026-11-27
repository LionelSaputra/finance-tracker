import Link from "next/link";
import { BottomNav, TopNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { RefreshOnReturn } from "@/components/RefreshOnReturn";
import { requireSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSession();
  return (
    <div className="min-h-screen pb-28 lg:pb-12">
      <header className="border-b-2 border-ink">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-narrow text-[22px] font-bold tracking-wide">
            Finance
          </Link>
          <div className="flex items-center gap-2">
          <TopNav />
          <Link href="/pengaturan" aria-label="Pengaturan" className="-mr-2.5 grid h-11 w-11 place-items-center rounded-full text-ink-2 hover:bg-rule/60">
            <Icon name="settings" />
          </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4">{children}</main>
      <BottomNav />
      <RefreshOnReturn />
    </div>
  );
}
