"use client";

import React, { useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";

/**
 * Small icon-only refresh button for list sections. Realtime updates
 * (WebSocket) aren't always reliable — this gives people a manual way to
 * pull fresh data without a full page reload.
 */
export function RefreshButton({
  onRefresh,
  label,
}: {
  onRefresh: () => Promise<unknown>;
  label: string;
}) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      await onRefresh();
    } finally {
      // Keep the spin visible briefly even for very fast refreshes —
      // an instant flash reads as "nothing happened" to the eye.
      setTimeout(() => setSpinning(false), 400);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={spinning}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-md border border-border hover:bg-muted flex items-center justify-center transition disabled:opacity-60 flex-shrink-0"
    >
      <ArrowsClockwise className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} weight="bold" />
    </button>
  );
}
