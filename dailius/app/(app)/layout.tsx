import type { ReactNode } from "react";
import { requireUser } from "@/features/auth/services/requireUser";
import { getProfile } from "@/features/auth/services/getProfile";
import { TopNav } from "@/components/app/TopNav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <TopNav email={user.email ?? ""} fullName={profile?.fullName} />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
