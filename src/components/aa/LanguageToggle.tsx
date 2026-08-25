"use client";

import React from "react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const langs: Language[] = ["ru", "en"];
  return (
    <div
      className={cn("inline-flex border border-[#EAEAEA] rounded-[6px] overflow-hidden text-xs font-semibold", className)}
      role="group"
      aria-label="Language toggle"
    >
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            "px-3 py-1.5 transition uppercase",
            lang === l
              ? "bg-[#111111] text-white"
              : "text-[#787774] hover:text-[#111111] hover:bg-[#F0EFEC]"
          )}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
