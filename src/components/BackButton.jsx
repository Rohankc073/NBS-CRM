"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ label = "Back", fallback = "/" }) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        // Prefer real history (preserves filters + page). Fall back to a
        // fixed path if there's no history (e.g. opened via direct link).
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="text-xs text-[#6C7A78] hover:text-[#14201F]"
    >
      {label}
    </button>
  );
}