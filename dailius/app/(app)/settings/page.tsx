import type { Metadata } from "next";
import { requireUser } from "@/features/auth/services/requireUser";
import { getProfile } from "@/features/auth/services/getProfile";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { DeleteAccountRequest } from "@/features/settings/components/DeleteAccountRequest";

export const metadata: Metadata = { title: "Settings — Dailius" };

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8 lg:px-12">
      <h1 className="text-2xl font-semibold text-navy">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your account security and data.</p>

      <div className="mt-8 space-y-6">
        <DashboardCard title="Change Password">
          <ChangePasswordForm />
        </DashboardCard>

        <DashboardCard title="Danger Zone">
          <DeleteAccountRequest initialRequestedAt={profile?.deletionRequestedAt ?? null} />
        </DashboardCard>
      </div>
    </div>
  );
}
