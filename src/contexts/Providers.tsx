"use client";

import React from "react";
import { AuthProvider } from "./AuthContext";
import { LanguageProvider } from "./LanguageContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  );
}
