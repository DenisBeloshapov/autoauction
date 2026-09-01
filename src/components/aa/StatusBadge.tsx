"use client";

import React from "react";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PENDING: "bg-[#FBF3DB] text-[#956400] border-[#F3E4B8]",
  SENT: "bg-[#E1F3FE] text-[#1F6C9F] border-[#C7E7F9]",
  WON: "bg-[#EDF3EC] text-[#346538] border-[#D8E6D6]",
  PROCESSING: "bg-[#F1EFE8] text-[#56534C] border-[#E4E1D8]",
  DELIVERY_REQUESTED: "bg-[#FBF3DB] text-[#956400] border-[#F3E4B8]",
  DELIVERY_CONFIRMED: "bg-[#EDF3EC] text-[#346538] border-[#D8E6D6]",
  COMPLETED: "bg-[#EAEAEA] text-[#2F3437] border-[#DEDEDE]",
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
  const style = STYLES[status] || "bg-[#F1EFE8] text-[#56534C] border-[#E4E1D8]";
  const shouldPulse = pulse ?? PULSING.has(status);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wide aa-mono",
        style,
        shouldPulse && "aa-pulse",
        className
      )}
    >
      {label || status}
    </span>
  );
}
