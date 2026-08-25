"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/aa/LanguageToggle";
import { toast } from "sonner";

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await login(username, password);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error || t("auth.invalidCredentials"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#F7F6F3]">
      <div className="absolute top-5 right-5">
        <LanguageToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px]"
      >
        <div className="bg-white border border-[#EAEAEA] rounded-[12px] p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#111111]" style={{ fontFamily: "var(--font-playfair)" }}>
              AutoAuction
            </h1>
            <p className="text-sm text-[#787774] mt-1">{t("app.tagline")}</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-semibold text-[#787774] uppercase tracking-wide">
                {t("auth.username")}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin…"
                autoComplete="username"
                autoFocus
                className="w-full h-12 rounded-[8px] border border-[#EAEAEA] bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-[#787774] uppercase tracking-wide">
                {t("auth.password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••…"
                autoComplete="current-password"
                className="w-full h-12 rounded-[8px] border border-[#EAEAEA] bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !username || !password}
              className="w-full h-12 rounded-[6px] bg-[#111111] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#333333] active:scale-[0.98] transition"
            >
              {submitting ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {t("auth.login")}
                  <ArrowRight size={18} weight="bold" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
