import type { ReactNode } from "react";
import { requireUser } from "@/features/auth/services/requireUser";
import { getProfile } from "@/features/auth/services/getProfile";
import { TimezoneSync } from "@/features/auth/components/TimezoneSync";
import { TopNav } from "@/components/app/TopNav";
import { EditRecordModalProvider } from "@/features/planning/components/EditRecordModal/EditRecordModalProvider";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <TimezoneSync currentTimezone={profile?.timezone ?? null} />
      <TopNav email={user.email ?? ""} fullName={profile?.fullName} />
      <main id="main" className="flex-1">
        <EditRecordModalProvider>{children}</EditRecordModalProvider>
      </main>
    </div>
  );
}
