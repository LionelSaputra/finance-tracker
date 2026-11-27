import { requireSession } from "@/lib/auth/session";

export default async function HomePage() {
  await requireSession();
  return <h1 className="text-xl font-semibold">Beranda</h1>;
}
