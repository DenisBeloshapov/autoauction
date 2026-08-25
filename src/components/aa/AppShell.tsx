"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { SignOut, Globe, Plus, Gear } from "@phosphor-icons/react/dist/ssr";
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
    <aside className="hidden md:flex md:w-[240px] md:flex-col md:fixed md:inset-y-0 md:left-0 border-r border-[#EAEAEA] bg-white px-5 py-6 z-30">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-[8px] bg-[#111111] flex items-center justify-center flex-shrink-0">
          <Globe size={18} weight="bold" className="text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#111111] truncate" style={{ fontFamily: "var(--font-playfair)" }}>
            AutoAuction
          </div>
          <div className="text-[11px] text-[#787774] truncate">
            {user?.role === "ADMIN" ? t("app.adminPanel") : t("app.clientPanel")}
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 flex-1">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "relative px-3 py-2.5 rounded-[6px] text-sm font-medium flex items-center gap-2.5 transition",
                active
                  ? "bg-[#111111] text-white"
                  : "text-[#787774] hover:text-[#111111] hover:bg-[#F0EFEC]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-4 pt-4 border-t border-[#EAEAEA]">
        <div className="text-xs text-[#787774] mb-2">{user?.name || user?.username}</div>
        <div className="flex items-center justify-between gap-2">
          <LanguageToggle />
          {user?.role === "ADMIN" && (
            <button
              onClick={() => setShowSettings(true)}
              className="h-9 w-9 rounded-[6px] border border-[#EAEAEA] hover:bg-[#F0EFEC] flex items-center justify-center transition"
              title={t("settings.title")}
              aria-label={t("settings.title")}
            >
              <Gear size={16} weight="bold" aria-hidden="true" />
            </button>
          )}
          <button
            onClick={logout}
            className="h-9 w-9 rounded-[6px] border border-[#EAEAEA] hover:bg-[#F0EFEC] flex items-center justify-center transition"
            title={t("auth.logout")}
            aria-label={t("auth.logout")}
          >
            <SignOut size={16} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );

  const MobileTopBar = (
    <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#EAEAEA]">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-[6px] bg-[#111111] flex items-center justify-center flex-shrink-0">
            <Globe size={16} weight="bold" className="text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate leading-tight" style={{ fontFamily: "var(--font-playfair)" }}>
              AutoAuction
            </div>
            <div className="text-[10px] text-[#787774] truncate leading-tight">
              {user?.role === "ADMIN" ? t("app.adminPanel") : t("app.clientPanel")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          {user?.role === "ADMIN" && (
            <button
              onClick={() => setShowSettings(true)}
              className="h-9 w-9 rounded-[6px] border border-[#EAEAEA] hover:bg-[#F0EFEC] flex items-center justify-center transition"
              aria-label={t("settings.title")}
            >
              <Gear size={16} weight="bold" aria-hidden="true" />
            </button>
          )}
          <button
            onClick={logout}
            className="h-9 w-9 rounded-[6px] border border-[#EAEAEA] hover:bg-[#F0EFEC] flex items-center justify-center transition"
            aria-label={t("auth.logout")}
          >
            <SignOut size={16} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );

  const MobileBottomBar = (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#EAEAEA] px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "relative flex-1 px-1 py-1.5 rounded-[6px] flex flex-col items-center gap-0.5 text-[10px] font-semibold transition",
                active ? "text-[#111111]" : "text-[#787774] hover:text-[#111111]"
              )}
            >
              {active && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute -top-1.5 w-1 h-1 rounded-full bg-[#111111]"
                  transition={{ type: "spring", damping: 26, stiffness: 320 }}
                />
              )}
              <span aria-hidden="true">{tab.icon}</span>
              <span className="truncate max-w-full">{tab.label}</span>
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
      className="md:hidden fixed right-4 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 h-12 px-5 rounded-[6px] bg-[#111111] text-white font-semibold flex items-center gap-1.5 active:scale-[0.98] transition"
      aria-label={fab.label}
    >
      {fab.icon || <Plus size={20} weight="bold" aria-hidden="true" />}
      <span className="text-sm">{fab.label}</span>
    </motion.button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F3]">
      {Sidebar}
      {MobileTopBar}
      <main className="flex-1 md:ml-[240px] px-4 sm:px-6 md:px-10 py-6 pb-28 md:pb-12">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
      <footer className="hidden md:block mt-auto ml-[240px] px-10 py-4 border-t border-[#EAEAEA] text-xs text-[#787774] text-center">
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
