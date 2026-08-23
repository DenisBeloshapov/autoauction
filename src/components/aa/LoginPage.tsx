"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, LogIn, Globe } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-[#eaf0ff] via-white to-[#f7f9fc]">
      <div className="absolute top-5 right-5">
        <LanguageToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 220 }}
        className="w-full max-w-[420px]"
      >
        <div className="aa-card aa-shadow p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-3xl aa-grad flex items-center justify-center mb-4 shadow-lg">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold aa-grad-text">
              AutoAuction
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("app.tagline")}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("auth.username")}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoFocus
                className="w-full h-12 rounded-2xl border border-input bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_24px_-8px_rgba(58,107,255,0.3)] transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t("auth.password")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full h-12 rounded-2xl border border-input bg-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_24px_-8px_rgba(58,107,255,0.3)] transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !username || !password}
              className="w-full h-12 rounded-2xl aa-grad text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:brightness-110 transition"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {t("auth.login")}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-2xl bg-muted/50 border border-border text-xs space-y-1">
            <p className="font-semibold text-foreground">Demo:</p>
            <p className="text-muted-foreground">
              ADMIN: <span className="aa-mono">admin / admin123</span>
            </p>
            <p className="text-muted-foreground">
              CLIENT: <span className="aa-mono">testclient / client123</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
