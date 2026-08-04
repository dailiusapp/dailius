import { createClient } from "@/lib/supabase/client";

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
