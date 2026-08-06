import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/features/auth/services/requireUser";
import { getProfile } from "@/features/auth/services/getProfile";
import { DashboardCard } from "@/features/dashboard/components/DashboardCard";
import { ProfileForm } from "@/features/profile/components/ProfileForm";

export const metadata: Metadata = {
  title: "Profile — Dailius",
  description: "Manage your account information.",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  const email = profile?.email ?? user.email ?? "";
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8 lg:px-12">
      <h1 className="text-2xl font-semibold text-navy">Profile</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your account information.</p>

      <div className="mt-8">
        <DashboardCard title="Account Information">
          <div className="space-y-6">
            <ProfileForm initialFullName={profile?.fullName ?? ""} />

            <div className="border-t border-gray-100 pt-6">
              <div className="text-sm font-medium text-navy">Email</div>
              <div className="mt-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] text-gray-500">
                {email}
              </div>
              <p className="mt-1.5 text-sm text-gray-500">Contact support to change your email.</p>
            </div>

            {memberSince ? (
              <div>
                <div className="text-sm font-medium text-navy">Member since</div>
                <p className="mt-1.5 text-[15px] text-gray-700">{memberSince}</p>
              </div>
            ) : null}
          </div>
        </DashboardCard>

        <p className="mt-6 text-center text-sm text-gray-500">
          Looking for password or account settings?{" "}
          <Link href="/settings" className="font-medium text-navy underline underline-offset-2">
            Visit Settings
          </Link>
        </p>
      </div>
    </div>
  );
}
