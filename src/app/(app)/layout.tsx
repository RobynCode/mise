import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <AppHeader userName={user.name} />
      <main className="page">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
