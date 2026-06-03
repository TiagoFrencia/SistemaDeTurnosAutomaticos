"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminSignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [submitting, setSubmitting] = useState(false);

  async function signOut() {
    setSubmitting(true);
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button className="admin-nav-button" disabled={submitting} onClick={signOut} type="button">
      {submitting ? "Saliendo..." : "Salir"}
    </button>
  );
}
