"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setMessage("로그아웃하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setMessage("로그아웃하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="museum-logout-wrap">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="museum-logout-button"
      >
        {loggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>

      {message && (
        <p
          role="status"
          className="museum-inline-error museum-logout-error"
        >
          {message}
        </p>
      )}
    </div>
  );
}
