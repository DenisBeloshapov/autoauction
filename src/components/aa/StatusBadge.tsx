"use client";

import React from "react";
import { cn } from "@/lib/utils";

const STYLES: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "var(--pale-yellow-bg)", text: "var(--pale-yellow-text)" },
  SENT: { bg: "var(--pale-blue-bg)", text: "var(--pale-blue-text)" },
  WON: { bg: "var(--pale-green-bg)", text: "var(--pale-green-text)" },
  PROCESSING: { bg: "var(--pale-purple-bg)", text: "var(--pale-purple-text)" },
  DELIVERY_REQUESTED: { bg: "var(--pale-indigo-bg)", text: "var(--pale-indigo-text)" },
  DELIVERY_CONFIRMED: { bg: "var(--pale-cyan-bg)", text: "var(--pale-cyan-text)" },
  COMPLETED: { bg: "#F0EFEC", text: "#787774" },
};

export function StatusBadge({
  status,
  label,
  className,
  pulse,
}: {
  status: string;
  label?: string;
  className?: string;
  pulse?: boolean;
}) {
  const style = STYLES[status] || { bg: "#F0EFEC", text: "#787774" };
  return (
    <span
      className={cn("aa-tag", className)}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label || status}
    </span>
  );
}
