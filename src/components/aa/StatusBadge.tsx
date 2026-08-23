"use client";

import React from "react";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  SENT: "bg-blue-100 text-blue-700 border-blue-200",
  WON: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PROCESSING: "bg-purple-100 text-purple-700 border-purple-200",
  DELIVERY_REQUESTED: "bg-indigo-100 text-indigo-700 border-indigo-200",
  DELIVERY_CONFIRMED: "bg-cyan-100 text-cyan-700 border-cyan-200",
  COMPLETED: "bg-gray-200 text-gray-700 border-gray-300",
};

// Statuses that visually "wait for action" — get a soft pulse
const PULSING = new Set(["PENDING", "DELIVERY_REQUESTED"]);

export function StatusBadge({
  status,
  label,
  className,
  pulse,
}: {
  status: string;
  label?: string;
  className?: string;
  /** Force pulse on/off; defaults to true for PENDING / DELIVERY_REQUESTED */
  pulse?: boolean;
}) {
  const style = STYLES[status] || "bg-gray-100 text-gray-700 border-gray-200";
  const shouldPulse = pulse ?? PULSING.has(status);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold aa-mono",
        style,
        shouldPulse && "aa-pulse",
        className
      )}
    >
      {label || status}
    </span>
  );
}
