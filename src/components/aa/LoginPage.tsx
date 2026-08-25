"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, User, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/aa/LanguageToggle";
import { toast } from "sonner";

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <div className="absolute top-5 right-5">
        <LanguageToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[400px]"
      >
        <div className="rounded-[28px] border border-border bg-card p-8 sm:p-10">
          {/* Mark */}
          <div className="flex flex-col items-center mb-9">
            <div className="w-11 h-11 rounded-[14px] bg-foreground flex items-center justify-center mb-5">
              <span className="text-background font-bold text-base tracking-tight">
                AA
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              AutoAuction
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("app.tagline")}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("auth.username")}
                autoFocus
                autoComplete="username"
                className="w-full h-12 rounded-[25px] border border-input bg-background pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/30 transition-colors"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.password")}
                autoComplete="current-password"
                className="w-full h-12 rounded-[25px] border border-input bg-background pl-11 pr-11 text-sm font-medium text-foreground placeholder:text-muted-foreground placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-foreground/30 focus:border-foreground/30 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={2} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={2} />
                )}
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={submitting || !username || !password}
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 rounded-[25px] bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors mt-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {t("auth.login")}
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
