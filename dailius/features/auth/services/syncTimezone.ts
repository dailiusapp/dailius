"use server";

import { requireUser } from "./requireUser";
import { createClient } from "@/lib/supabase/server";

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Called from TimezoneSync on the client whenever the browser's detected
// IANA timezone differs from what's stored — never trusted blindly since it
// crosses the client/server boundary, even though in practice it always
// comes from Intl.DateTimeFormat().resolvedOptions().timeZone.
export async function syncTimezone(timezone: string): Promise<void> {
  if (!isValidTimezone(timezone)) return;

  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("profiles").update({ timezone }).eq("id", user.id);
}
