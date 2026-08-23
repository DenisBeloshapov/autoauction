"use client";

import React from "react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const langs: Language[] = ["ru", "en"];
  return (
    <div
      className={cn(
        "inline-flex p-1 rounded-full bg-muted border border-border text-xs font-semibold",
        className
      )}
      role="group"
      aria-label="Language toggle"
    >
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn(
            "px-3 py-1.5 rounded-full transition uppercase",
            lang === l
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
