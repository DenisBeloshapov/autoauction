"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Globe, Plus, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/aa/LanguageToggle";
import { SettingsModal } from "@/components/aa/SettingsModal";
import { cn } from "@/lib/utils";

export interface Tab {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export interface AppShellProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (k: string) => void;
  children: React.ReactNode;
  fab?: { label: string; icon?: React.ReactNode; onClick: () => void };
}

export function AppShell({ tabs, activeTab, onTabChange, children, fab }: AppShellProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);

  const Sidebar = (
    <aside className="hidden md:flex md:w-[260px] md:flex-col md:fixed md:inset-y-0 md:left-0 border-r border-border/60 bg-white/70 backdrop-blur-xl px-5 py-6 z-30">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-2xl aa-grad flex items-center justify-center aa-shadow flex-shrink-0">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold text-foreground truncate">AutoAuction</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {user?.role === "ADMIN" ? t("app.adminPanel") : t("app.clientPanel")}
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "relative px-4 py-3 rounded-2xl text-sm font-semibold flex items-center gap-3 transition",
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {active && (
                <motion.div
                  layoutId="side-tab-indicator"
                  className="absolute inset-0 rounded-2xl aa-grad"
                  transition={{ type: "spring", damping: 26, stiffness: 320 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                {tab.icon}
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="mt-4 pt-4 border-t border-border/60">
        <div className="text-xs text-muted-foreground mb-2">{user?.name || user?.username}</div>
        <div className="flex items-center justify-between gap-2">
          <LanguageToggle />
          {user?.role === "ADMIN" && (
            <button
              onClick={() => setShowSettings(true)}
              className="h-9 w-9 rounded-xl border border-border bg-white hover:bg-muted flex items-center justify-center transition"
              title={t("settings.title")}
              aria-label={t("settings.title")}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={logout}
            className="h-9 px-3 rounded-xl border border-border bg-white hover:bg-muted text-xs font-medium flex items-center gap-1.5 transition"
            title={t("auth.logout")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  const MobileTopBar = (
    <header className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-border/60">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl aa-grad flex items-center justify-center shadow-md flex-shrink-0">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate leading-tight">AutoAuction</div>
            <div className="text-[10px] text-muted-foreground truncate leading-tight">
              {user?.role === "ADMIN" ? t("app.adminPanel") : t("app.clientPanel")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {user?.role === "ADMIN" && (
            <button
              onClick={() => setShowSettings(true)}
              className="h-9 w-9 rounded-xl border border-border bg-white hover:bg-muted flex items-center justify-center transition"
              title={t("settings.title")}
              aria-label={t("settings.title")}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={logout}
            className="h-9 w-9 rounded-xl border border-border bg-white hover:bg-muted flex items-center justify-center transition"
            title={t("auth.logout")}
            aria-label={t("auth.logout")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );

  const MobileBottomBar = (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-xl border-t border-border/60 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "relative flex-1 px-2 py-1.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-semibold transition",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute inset-x-2 top-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", damping: 26, stiffness: 320 }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10 truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  const MobileFab = fab && (
    <motion.button
      onClick={fab.onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 320, delay: 0.2 }}
      className="md:hidden fixed right-5 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 h-14 px-5 rounded-full aa-grad text-white font-semibold flex items-center gap-2 aa-shadow"
      aria-label={fab.label}
    >
      {fab.icon || <Plus className="w-5 h-5" />}
      <span className="text-sm">{fab.label}</span>
    </motion.button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {Sidebar}
      {MobileTopBar}
      <main className="flex-1 md:ml-[260px] px-4 sm:px-6 md:px-10 py-6 pb-28 md:pb-12">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-6xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
      <footer className="hidden md:block mt-auto ml-[260px] px-10 py-5 border-t border-border/60 text-xs text-muted-foreground text-center">
        AutoAuction · v1.0 · {new Date().getFullYear()}
      </footer>
      {MobileBottomBar}
      {MobileFab}
      {user?.role === "ADMIN" && (
        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
